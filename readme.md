# Fabric 환경 변수 설정 (test-network.sh 스크립트가 실행된 디렉토리에서)
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/

# 1. 체인코드 패키징
# 위에서 만든 chaincode 폴더의 경로를 지정합니다.
# 예: PEER_CONN_ARGS는 network.sh가 export한 변수를 사용합니다.
# lifecycle chaincode 패키징 명령어를 사용하여 체인코드를 패키징합니다.
peer lifecycle chaincode package voting.tar.gz --path ../my-fabric-app/chaincode --lang node --label voting_1

# 2. 각 피어에 체인코드 설치
# Org1 피어에 설치
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install voting.tar.gz

# Org2 피어에 설치
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install voting.tar.gz

# 3. 체인코드 정의 승인 (각 조직별로)
# `peer lifecycle chaincode install` 후 출력되는 Package ID를 확인합니다.
export CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "voting_1" | awk '{print $3}' | sed 's/.$//')

# Org2 승인
# mychannel 채널에 voting 체인코드를 승인.
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name voting --version 1.0 --init-required --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Org1 환경 변수로 변경
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Org1 승인
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name voting --version 1.0 --init-required --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"


# 4. 체인코드 정의를 채널에 커밋
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name voting --version 1.0 --sequence 1 --init-required --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"


# 체인코드 초기화
# 후보자 리스트를 JSON 문자열로 전달합니다.
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n voting --isInit -c '{"function":"InitLedger","Args":["[\"Candidate A\",\"Candidate B\",\"Candidate C\"]"]}' --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

# 투표 현황 조회
peer chaincode query -C mychannel -n voting -c '{"Args":["queryAllCandidates"]}'

# Org1의 사용자가 'Candidate A'에게 투표
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n voting -c '{"function":"voteForCandidate","Args":["Candidate A"]}' --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"


# 투표 현황 조회
peer chaincode query -C mychannel -n voting -c '{"Args":["queryAllCandidates"]}'
