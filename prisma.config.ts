// Prisma configuration
interface PrismaConfig {
  skills?: {
    agents?: string[];
  };
}

export function definePrismaConfig(config: PrismaConfig): PrismaConfig {
  return config;
}

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
