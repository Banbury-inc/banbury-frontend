export interface ModelInfo {
  name: string;
  category: string;
  tools: boolean;
  thinking: boolean;
  size: string;
  isDownloaded?: boolean;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Large Language Models
  { name: 'llama2', category: 'Large Language Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'llama2:7b', category: 'Large Language Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'llama2:13b', category: 'Large Language Models', size: '7.3 GB', thinking: false, tools: false },
  { name: 'llama2:70b', category: 'Large Language Models', size: '39.1 GB', thinking: false, tools: false },
  { name: 'llama2-uncensored', category: 'Large Language Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'llama3.1:latest', category: 'Large Language Models', size: '4.9 GB', thinking: false, tools: false },
  { name: 'llama3.1:8b', category: 'Large Language Models', size: '4.9 GB', thinking: false, tools: false },
  { name: 'llama3.1:70b', category: 'Large Language Models', size: '43 GB', thinking: false, tools: false },
  { name: 'llama3.1:405b', category: 'Large Language Models', size: '243 GB', thinking: false, tools: false },
  { name: 'qwen3:latest', category: 'Large Language Models', size: '5.2 GB', thinking: true, tools: true},
  
  // Code Models
  { name: 'codellama', category: 'Code Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'codellama:7b', category: 'Code Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'deepseek-coder', category: 'Code Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'deepseek-coder:6.7b', category: 'Code Models', size: '3.8 GB', thinking: false, tools: false },
  { name: 'deepseek-coder:33b', category: 'Code Models', size: '18.7 GB', thinking: false, tools: false },
  
  // Research Models
  { name: 'deepseek:7b', category: 'Research Models', size: '3.8 GB', thinking: true, tools: false },
  
  // Small Models
  { name: 'tinyllama', category: 'Small Models', size: '0.7 GB', thinking: true, tools: false },
  { name: 'tinyllama:1.1b', category: 'Small Models', size: '0.7 GB', thinking: true, tools: false },
  
  // Specialized Models
  { name: 'falcon:7b', category: 'Specialized Models', size: '3.8 GB', thinking: true, tools: false },
];