import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';

/**
 * Simplified tool system that avoids complex LangChain generic types
 * while maintaining type safety and functionality
 */

export interface SimpleTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    default?: any;
    optional?: boolean;
  }>;
  execute: (params: any) => Promise<string>;
}

export interface ToolSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    default?: any;
    optional?: boolean;
  };
}

/**
 * Create a simplified tool that can be easily converted to LangChain format
 */
export function createSimpleTool(
  name: string,
  description: string,
  schema: ToolSchema,
  execute: (params: any) => Promise<string>
): SimpleTool {
  return {
    name,
    description,
    parameters: schema,
    execute
  };
}

/**
 * Convert simplified schema to Zod schema with proper JSON Schema format
 */
function convertToZodSchema(simpleSchema: ToolSchema): any {
  const zodFields: Record<string, any> = {};
  
  for (const [key, config] of Object.entries(simpleSchema)) {
    let field: any;
    
    // Create base field based on type
    switch (config.type) {
      case 'string':
        field = z.string();
        break;
      case 'number':
        field = z.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'object':
        field = z.object({});
        break;
      case 'array':
        field = z.array(z.any());
        break;
      default:
        field = z.string();
    }
    
    // Add description
    field = field.describe(config.description);
    
    // Make optional if specified
    if (config.optional || !config.required) {
      field = field.optional();
    }
    
    // Add default value if specified
    if (config.default !== undefined) {
      field = field.default(config.default);
    }
    
    zodFields[key] = field;
  }
  
  // Create the Zod object schema
  const zodSchema = z.object(zodFields);
  
  // Add a custom toJsonSchema method that ensures proper JSON Schema format
  (zodSchema as any).toJsonSchema = () => {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const [key, config] of Object.entries(simpleSchema)) {
      properties[key] = {
        type: config.type,
        description: config.description
      };
      
      if (config.default !== undefined) {
        properties[key].default = config.default;
      }
      
      if (config.required && !config.optional) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false
    };
  };
  
  return zodSchema;
}

/**
 * Convert simplified tools to LangChain-compatible format
 * Creates a tool-like object that works with ChatAnthropic
 */
export function convertToLangChainTool(simpleTool: SimpleTool): any {
  const zodSchema = convertToZodSchema(simpleTool.parameters);
  
  // Create a proper DynamicStructuredTool instance
  return new DynamicStructuredTool({
    name: simpleTool.name,
    description: simpleTool.description,
    schema: zodSchema,
    func: async (params: any) => {
      return await simpleTool.execute(params);
    }
  });
}

/**
 * Helper function to create tool parameters with proper typing
 */
export function createToolParameter(
  type: 'string' | 'number' | 'boolean' | 'object' | 'array',
  description: string,
  options: {
    required?: boolean;
    default?: any;
    optional?: boolean;
  } = {}
) {
  return {
    type,
    description,
    ...options
  };
} 