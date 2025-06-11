'use strict';

const { Contract } = require('fabric-contract-api');

class VotingContract extends Contract {

    // 1. 초기화 함수 (InitLedger)
    // 체인코드가 채널에 배포될 때 호출되어 초기 상태를 설정합니다.
    // Solidity의 constructor와 유사한 역할을 합니다.
    async InitLedger(ctx, candidateNamesJSON) {
        console.info('============= START : Initialize Ledger ===========');
        
        // 후보자 목록을 JSON 문자열로 받아 파싱합니다.
        const candidateNames = JSON.parse(candidateNamesJSON);
        const candidates = [];
        
        for (const name of candidateNames) {
            const candidate = {
                name: name,
                votes: 0, // 투표 수를 저장할 필드
            };
            candidates.push(candidate);
        }

        // 'candidates'라는 키로 후보자 목록을 월드 스테이트에 저장합니다.
        // 데이터를 Buffer(byte array) 형태로 저장해야 하므로 JSON.stringify 후 Buffer.from으로 변환합니다.
        await ctx.stub.putState('candidates', Buffer.from(JSON.stringify(candidates)));
        
        // 투표한 사용자 목록을 저장할 객체를 초기화합니다.
        // Solidity의 hasVoted 매핑과 유사한 역할을 합니다.
        await ctx.stub.putState('voters', Buffer.from(JSON.stringify({})));

        console.info('============= END : Initialize Ledger ===========');
    }

    // 2. 후보자에게 투표하는 함수
    async voteForCandidate(ctx, candidateName) {
        // --- 1. 투표자 신원 확인 ---
        // 트랜잭션을 호출한 클라이언트의 고유 ID를 가져옵니다.
        // Solidity의 msg.sender와 유사합니다.
        const voterId = ctx.clientIdentity.getID();
        
        const votersAsBytes = await ctx.stub.getState('voters');
        if (!votersAsBytes || votersAsBytes.length === 0) {
            throw new Error('Voter list does not exist');
        }
        const voters = JSON.parse(votersAsBytes.toString());

        // 이미 투표했는지 확인합니다.
        if (voters[voterId]) {
            throw new Error(`Voter with ID ${voterId} has already voted.`);
        }

        // --- 2. 후보자 존재 여부 확인 및 투표 수 증가 ---
        const candidatesAsBytes = await ctx.stub.getState('candidates');
        if (!candidatesAsBytes || candidatesAsBytes.length === 0) {
            throw new Error('No candidates found.');
        }
        const candidates = JSON.parse(candidatesAsBytes.toString());

        const candidateIndex = candidates.findIndex(c => c.name === candidateName);
        if (candidateIndex < 0) {
            throw new Error(`Candidate ${candidateName} does not exist.`);
        }

        // 투표 수를 1 증가시킵니다.
        candidates[candidateIndex].votes += 1;
        
        // --- 3. 상태 업데이트 ---
        // 투표자 목록에 현재 투표자를 추가합니다.
        voters[voterId] = true;

        // 업데이트된 후보자 목록과 투표자 목록을 월드 스테이트에 다시 저장합니다.
        await ctx.stub.putState('candidates', Buffer.from(JSON.stringify(candidates)));
        await ctx.stub.putState('voters', Buffer.from(JSON.stringify(voters)));

        return JSON.stringify({ status: 'success', message: `Vote for ${candidateName} has been recorded.` });
    }

    // 3. 모든 후보자 정보와 투표 수를 조회하는 함수 (Query)
    // 데이터를 변경하지 않고 읽기만 합니다.
    async queryAllCandidates(ctx) {
        const candidatesAsBytes = await ctx.stub.getState('candidates');
        if (!candidatesAsBytes || candidatesAsBytes.length === 0) {
            throw new Error('No candidates found.');
        }
        console.log(candidatesAsBytes.toString());
        return candidatesAsBytes.toString();
    }
}

module.exports = VotingContract;