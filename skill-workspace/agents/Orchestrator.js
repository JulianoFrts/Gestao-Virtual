import * as Agent003 from './agents/003_IMPLEMENTER';
import * as Agent004 from './agents/004_AUDITOR';
import * as Agent005 from './agents/005_STRATEGIST';
import * as Agent006 from './agents/006_EXECUTOR';

type AgentMap = {
  [key: string]: () => Promise<any>;
};

const agents: AgentMap = {
  '003': Agent003.run,
  '004': Agent004.run,
  '005': Agent005.run,
  '006': Agent006.run,
};

export async function executeAgent(agentId: string) {
  const agent = agents[agentId];

  if (!agent) {
    return `❌ Agente ${agentId} não encontrado.`;
  }

  const result = await agent();

  return `
🤖 Agente ${result.agent}
📅 ${result.timestamp}

${result.outputs.map((o: string) => `• ${o}`).join('\n')}
`;
}