// Reference to Claude account skill
// Note: Skills are only supported by Anthropic provider
// Each skill must have a unique ID
export const brazeProfileSkill = {
  type: "custom" as const,
  skillId: "skill_01HjpdegffeFSmYfBCjavJ1H", // braze-profile-model
  version: "latest" as const,
};

// Export single skill for registration with Anthropic models
export const claudeAccountSkills = [brazeProfileSkill];
