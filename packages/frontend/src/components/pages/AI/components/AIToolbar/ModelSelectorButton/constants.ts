export interface ModelInfo {
  name: string;
  category: string;
  size: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Large Language Models
  { name: 'llama2', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'llama2:7b', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'llama2:13b', category: 'Large Language Models', size: '7.3 GB' },
  { name: 'llama2:70b', category: 'Large Language Models', size: '39.1 GB' },
  { name: 'llama2-uncensored', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'mistral', category: 'Large Language Models', size: '4.1 GB' },
  { name: 'mixtral', category: 'Large Language Models', size: '26.1 GB' },
  { name: 'mixtral:8x7b', category: 'Large Language Models', size: '26.1 GB' },
  { name: 'neural-chat', category: 'Large Language Models', size: '4.1 GB' },
  { name: 'vicuna', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'vicuna:7b', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'vicuna:13b', category: 'Large Language Models', size: '7.3 GB' },
  { name: 'wizard-vicuna', category: 'Large Language Models', size: '3.8 GB' },
  
  // Code Models
  { name: 'codellama', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama:7b', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama:13b', category: 'Code Models', size: '7.3 GB' },
  { name: 'codellama:34b', category: 'Code Models', size: '19.1 GB' },
  { name: 'codellama-python', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama-python:7b', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama-python:13b', category: 'Code Models', size: '7.3 GB' },
  { name: 'codellama-python:34b', category: 'Code Models', size: '19.1 GB' },
  { name: 'deepseek-coder', category: 'Code Models', size: '3.8 GB' },
  { name: 'deepseek-coder:6.7b', category: 'Code Models', size: '3.8 GB' },
  { name: 'deepseek-coder:33b', category: 'Code Models', size: '18.7 GB' },
  
  // Research Models
  { name: 'deepseek', category: 'Research Models', size: '3.8 GB' },
  { name: 'deepseek:7b', category: 'Research Models', size: '3.8 GB' },
  { name: 'deepseek:33b', category: 'Research Models', size: '18.7 GB' },
  { name: 'deepseek:67b', category: 'Research Models', size: '37.8 GB' },
  { name: 'deepseek-r1:1.5b', category: 'Research Models', size: '1.1 GB' },
  { name: 'deepseek-r1:7b', category: 'Research Models', size: '4.7 GB' },
  { name: 'deepseek-r1:8b', category: 'Research Models', size: '4.9 GB' },
  { name: 'deepseek-r1:14b', category: 'Research Models', size: '9.0 GB' },
  { name: 'deepseek-r1:32b', category: 'Research Models', size: '20 GB' },
  { name: 'deepseek-r1:70b', category: 'Research Models', size: '43 GB' },
  { name: 'deepseek-r1:671b', category: 'Research Models', size: '404 GB' },
  { name: 'phi', category: 'Research Models', size: '1.6 GB' },
  { name: 'phi:2.7b', category: 'Research Models', size: '1.6 GB' },
  { name: 'qwen', category: 'Research Models', size: '3.8 GB' },
  { name: 'qwen:7b', category: 'Research Models', size: '3.8 GB' },
  { name: 'qwen:14b', category: 'Research Models', size: '7.8 GB' },
  { name: 'qwen:72b', category: 'Research Models', size: '40.5 GB' },
  { name: 'starling-lm', category: 'Research Models', size: '4.1 GB' },
  { name: 'starling-lm:7b', category: 'Research Models', size: '4.1 GB' },
  
  // Small Models
  { name: 'orca-mini', category: 'Small Models', size: '2.0 GB' },
  { name: 'orca-mini:3b', category: 'Small Models', size: '1.8 GB' },
  { name: 'orca-mini:7b', category: 'Small Models', size: '3.8 GB' },
  { name: 'dolphin-phi', category: 'Small Models', size: '1.6 GB' },
  { name: 'tinyllama', category: 'Small Models', size: '0.7 GB' },
  { name: 'tinyllama:1.1b', category: 'Small Models', size: '0.7 GB' },
  
  // Specialized Models
  { name: 'stable-beluga', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'nous-hermes', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'solar', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'neural-chat', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'openchat', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'openhermes', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'openhermes:7b', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'openhermes:2.5', category: 'Specialized Models', size: '1.6 GB' },
  { name: 'zephyr', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'zephyr:7b', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'yi', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'yi:6b', category: 'Specialized Models', size: '3.5 GB' },
  { name: 'yi:34b', category: 'Specialized Models', size: '19.1 GB' },
  { name: 'falcon', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'falcon:7b', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'falcon:40b', category: 'Specialized Models', size: '22.4 GB' },
];