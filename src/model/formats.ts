// BAR-105.1.1-807-g98b14ce
export type EngineTagFormat = `BAR-${number}.${number}.${number}-${number}-g${string}`;
export const EngineTagFormatRegex = /^BAR-\d+\.\d+\.\d+-\d+-g[0-9a-f]+$/;
export const isEngineTag = (engineString: string): engineString is EngineTagFormat => EngineTagFormatRegex.test(engineString);