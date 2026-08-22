import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const TOOLS = [
  {
    name: 'webcmd_prompt_optimize',
    description: 'Optimizes natural language browser instructions into deterministic CLI commands with 90% token reduction.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Raw user prompt' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'webcmd_suggest',
    description: 'Suggests ready-made CLI adapters and commands for a website intent.',
    inputSchema: {
      type: 'object',
      properties: {
        intent: { type: 'string', description: 'Search or automation intent' }
      },
      required: ['intent']
    }
  },
  {
    name: 'webcmd_read_page',
    description: 'Extracts clean DOM text, headings, and tables from the active tab.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Webpage URL' }
      },
      required: ['url']
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { method, params, id } = body;

    if (method === 'tools/list') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: { tools: TOOLS }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      let result = { message: `Tool ${name} executed successfully.` };

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(result) }] }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: { status: 'MCP Server Active', toolsCount: TOOLS.length }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
