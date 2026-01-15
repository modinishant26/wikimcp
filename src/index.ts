#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { ConfluenceClient } from './confluence-client.js';

dotenv.config();

// Validate required environment variables
const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const PAT = process.env.PAT;

if (!CONFLUENCE_BASE_URL || !PAT) {
  console.error('Missing required environment variables: CONFLUENCE_BASE_URL and PAT');
  process.exit(1);
}

// Initialize Confluence client
const confluenceClient = new ConfluenceClient({
  baseUrl: CONFLUENCE_BASE_URL,
  pat: PAT,
});

// Create MCP server
const server = new Server(
  {
    name: 'confluence-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool definitions
const tools = [
  // Connection
  {
    name: 'confluence_test_connection',
    description: 'Test connection to Confluence API',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'confluence_get_current_user',
    description: 'Get the current authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // Spaces
  {
    name: 'confluence_get_spaces',
    description: 'List all spaces in Confluence',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'number', description: 'Starting index for pagination' },
        limit: { type: 'number', description: 'Maximum number of results (default 25)' },
        type: { type: 'string', description: 'Filter by space type (global, personal)' },
        status: { type: 'string', description: 'Filter by space status (current, archived)' },
      },
      required: [],
    },
  },
  {
    name: 'confluence_get_space',
    description: 'Get details of a specific space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'The space key' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand (e.g., description, homepage)' 
        },
      },
      required: ['spaceKey'],
    },
  },
  {
    name: 'confluence_create_space',
    description: 'Create a new space',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Unique space key (uppercase letters)' },
        name: { type: 'string', description: 'Space name' },
        description: { type: 'string', description: 'Space description' },
        type: { type: 'string', enum: ['global', 'personal'], description: 'Space type' },
      },
      required: ['key', 'name'],
    },
  },
  {
    name: 'confluence_delete_space',
    description: 'Delete a space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'The space key to delete' },
      },
      required: ['spaceKey'],
    },
  },

  // Pages
  {
    name: 'confluence_get_page',
    description: 'Get a page by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand (default: body.storage, version, space, ancestors)' 
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_page_by_title',
    description: 'Get a page by its title within a space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'The space key' },
        title: { type: 'string', description: 'The page title' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand' 
        },
      },
      required: ['spaceKey', 'title'],
    },
  },
  {
    name: 'confluence_get_pages',
    description: 'List pages with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'Filter by space key' },
        title: { type: 'string', description: 'Filter by title' },
        status: { type: 'string', description: 'Filter by status (current, trashed, draft)' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand' 
        },
      },
      required: [],
    },
  },
  {
    name: 'confluence_create_page',
    description: 'Create a new page',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'Space key where the page will be created' },
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content in storage format (XHTML)' },
        parentId: { type: 'string', description: 'Parent page ID (optional)' },
        contentFormat: { 
          type: 'string', 
          enum: ['storage', 'wiki'],
          description: 'Content format (default: storage)' 
        },
      },
      required: ['spaceKey', 'title', 'content'],
    },
  },
  {
    name: 'confluence_update_page',
    description: 'Update an existing page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID to update' },
        title: { type: 'string', description: 'New page title' },
        content: { type: 'string', description: 'New page content in storage format' },
        version: { type: 'number', description: 'Current version number (required for update)' },
        contentFormat: { 
          type: 'string', 
          enum: ['storage', 'wiki'],
          description: 'Content format (default: storage)' 
        },
      },
      required: ['pageId', 'title', 'content', 'version'],
    },
  },
  {
    name: 'confluence_delete_page',
    description: 'Delete a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID to delete' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_move_page',
    description: 'Move a page to a different location or space',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID to move' },
        targetSpaceKey: { type: 'string', description: 'Target space key' },
        targetParentId: { type: 'string', description: 'Target parent page ID' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_page_children',
    description: 'Get child pages of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The parent page ID' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand' 
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_page_ancestors',
    description: 'Get ancestor pages (breadcrumb path) of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
      },
      required: ['pageId'],
    },
  },

  // Search
  {
    name: 'confluence_search',
    description: 'Search Confluence using CQL (Confluence Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        cql: { type: 'string', description: 'CQL query string' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand' 
        },
      },
      required: ['cql'],
    },
  },
  {
    name: 'confluence_search_content',
    description: 'Search content by text query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text search query' },
        spaceKey: { type: 'string', description: 'Limit search to a specific space' },
        type: { type: 'string', description: 'Content type (page, blogpost, comment)' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['query'],
    },
  },

  // Labels
  {
    name: 'confluence_get_labels',
    description: 'Get labels on a piece of content',
    inputSchema: {
      type: 'object',
      properties: {
        contentId: { type: 'string', description: 'The content ID (page/blogpost)' },
      },
      required: ['contentId'],
    },
  },
  {
    name: 'confluence_add_labels',
    description: 'Add labels to content',
    inputSchema: {
      type: 'object',
      properties: {
        contentId: { type: 'string', description: 'The content ID' },
        labels: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Labels to add' 
        },
      },
      required: ['contentId', 'labels'],
    },
  },
  {
    name: 'confluence_remove_label',
    description: 'Remove a label from content',
    inputSchema: {
      type: 'object',
      properties: {
        contentId: { type: 'string', description: 'The content ID' },
        label: { type: 'string', description: 'Label to remove' },
      },
      required: ['contentId', 'label'],
    },
  },
  {
    name: 'confluence_get_content_by_label',
    description: 'Get all content with a specific label',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'The label to search for' },
        spaceKey: { type: 'string', description: 'Limit to a specific space' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['label'],
    },
  },

  // Comments
  {
    name: 'confluence_get_comments',
    description: 'Get comments on a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
        expand: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Fields to expand' 
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_add_comment',
    description: 'Add a comment to a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        content: { type: 'string', description: 'Comment content in storage format' },
      },
      required: ['pageId', 'content'],
    },
  },

  // Attachments
  {
    name: 'confluence_get_attachments',
    description: 'Get attachments on a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
        filename: { type: 'string', description: 'Filter by filename' },
        mediaType: { type: 'string', description: 'Filter by media type' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_attachment',
    description: 'Get details of a specific attachment',
    inputSchema: {
      type: 'object',
      properties: {
        attachmentId: { type: 'string', description: 'The attachment ID' },
      },
      required: ['attachmentId'],
    },
  },
  {
    name: 'confluence_delete_attachment',
    description: 'Delete an attachment',
    inputSchema: {
      type: 'object',
      properties: {
        attachmentId: { type: 'string', description: 'The attachment ID to delete' },
      },
      required: ['attachmentId'],
    },
  },

  // History
  {
    name: 'confluence_get_page_history',
    description: 'Get version history of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        start: { type: 'number', description: 'Starting index' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_page_version',
    description: 'Get a specific version of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        version: { type: 'number', description: 'Version number' },
      },
      required: ['pageId', 'version'],
    },
  },

  // Users
  {
    name: 'confluence_search_users',
    description: 'Search for users',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (username or display name)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'confluence_get_user',
    description: 'Get user details by username',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'The username' },
      },
      required: ['username'],
    },
  },

  // Permissions
  {
    name: 'confluence_get_page_restrictions',
    description: 'Get restrictions (permissions) on a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
      },
      required: ['pageId'],
    },
  },

  // Templates
  {
    name: 'confluence_get_templates',
    description: 'Get available page templates',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'Filter by space key (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'confluence_get_template',
    description: 'Get a specific template by ID',
    inputSchema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'The template ID' },
      },
      required: ['templateId'],
    },
  },

  // Watchers
  {
    name: 'confluence_get_watchers',
    description: 'Get watchers of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_add_watcher',
    description: 'Add a watcher to a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        username: { type: 'string', description: 'Username to add as watcher' },
      },
      required: ['pageId', 'username'],
    },
  },
  {
    name: 'confluence_remove_watcher',
    description: 'Remove a watcher from a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'The page ID' },
        username: { type: 'string', description: 'Username to remove' },
      },
      required: ['pageId', 'username'],
    },
  },
];

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // Connection
      case 'confluence_test_connection':
        result = await confluenceClient.testConnection();
        break;
      case 'confluence_get_current_user':
        result = await confluenceClient.getCurrentUser();
        break;

      // Spaces
      case 'confluence_get_spaces':
        result = await confluenceClient.getSpaces(args as {
          start?: number;
          limit?: number;
          type?: string;
          status?: string;
        });
        break;
      case 'confluence_get_space':
        result = await confluenceClient.getSpace(
          args?.spaceKey as string,
          args?.expand as string[]
        );
        break;
      case 'confluence_create_space':
        result = await confluenceClient.createSpace(args as {
          key: string;
          name: string;
          description?: string;
          type?: 'global' | 'personal';
        });
        break;
      case 'confluence_delete_space':
        result = await confluenceClient.deleteSpace(args?.spaceKey as string);
        break;

      // Pages
      case 'confluence_get_page':
        result = await confluenceClient.getPage(
          args?.pageId as string,
          args?.expand as string[]
        );
        break;
      case 'confluence_get_page_by_title':
        result = await confluenceClient.getPageByTitle(
          args?.spaceKey as string,
          args?.title as string,
          args?.expand as string[]
        );
        break;
      case 'confluence_get_pages':
        result = await confluenceClient.getPages(args as {
          spaceKey?: string;
          title?: string;
          status?: string;
          start?: number;
          limit?: number;
          expand?: string[];
        });
        break;
      case 'confluence_create_page':
        result = await confluenceClient.createPage(args as {
          spaceKey: string;
          title: string;
          content: string;
          parentId?: string;
          contentFormat?: 'storage' | 'wiki';
        });
        break;
      case 'confluence_update_page':
        result = await confluenceClient.updatePage(args as {
          pageId: string;
          title: string;
          content: string;
          version: number;
          contentFormat?: 'storage' | 'wiki';
        });
        break;
      case 'confluence_delete_page':
        result = await confluenceClient.deletePage(args?.pageId as string);
        break;
      case 'confluence_move_page':
        result = await confluenceClient.movePage(args as {
          pageId: string;
          targetSpaceKey?: string;
          targetParentId?: string;
        });
        break;
      case 'confluence_get_page_children':
        result = await confluenceClient.getPageChildren(
          args?.pageId as string,
          args as { start?: number; limit?: number; expand?: string[] }
        );
        break;
      case 'confluence_get_page_ancestors':
        result = await confluenceClient.getPageAncestors(args?.pageId as string);
        break;

      // Search
      case 'confluence_search':
        result = await confluenceClient.search(args as {
          cql: string;
          start?: number;
          limit?: number;
          expand?: string[];
        });
        break;
      case 'confluence_search_content':
        result = await confluenceClient.searchContent(args as {
          query: string;
          spaceKey?: string;
          type?: string;
          start?: number;
          limit?: number;
        });
        break;

      // Labels
      case 'confluence_get_labels':
        result = await confluenceClient.getLabels(args?.contentId as string);
        break;
      case 'confluence_add_labels':
        result = await confluenceClient.addLabels(
          args?.contentId as string,
          args?.labels as string[]
        );
        break;
      case 'confluence_remove_label':
        result = await confluenceClient.removeLabel(
          args?.contentId as string,
          args?.label as string
        );
        break;
      case 'confluence_get_content_by_label':
        result = await confluenceClient.getContentByLabel(
          args?.label as string,
          args as { spaceKey?: string; start?: number; limit?: number }
        );
        break;

      // Comments
      case 'confluence_get_comments':
        result = await confluenceClient.getComments(
          args?.pageId as string,
          args as { start?: number; limit?: number; expand?: string[] }
        );
        break;
      case 'confluence_add_comment':
        result = await confluenceClient.addComment(
          args?.pageId as string,
          args?.content as string
        );
        break;

      // Attachments
      case 'confluence_get_attachments':
        result = await confluenceClient.getAttachments(
          args?.pageId as string,
          args as { start?: number; limit?: number; filename?: string; mediaType?: string }
        );
        break;
      case 'confluence_get_attachment':
        result = await confluenceClient.getAttachment(args?.attachmentId as string);
        break;
      case 'confluence_delete_attachment':
        result = await confluenceClient.deleteAttachment(args?.attachmentId as string);
        break;

      // History
      case 'confluence_get_page_history':
        result = await confluenceClient.getPageHistory(
          args?.pageId as string,
          args as { start?: number; limit?: number }
        );
        break;
      case 'confluence_get_page_version':
        result = await confluenceClient.getPageVersion(
          args?.pageId as string,
          args?.version as number
        );
        break;

      // Users
      case 'confluence_search_users':
        result = await confluenceClient.searchUsers(args?.query as string);
        break;
      case 'confluence_get_user':
        result = await confluenceClient.getUser(args?.username as string);
        break;

      // Permissions
      case 'confluence_get_page_restrictions':
        result = await confluenceClient.getPageRestrictions(args?.pageId as string);
        break;

      // Templates
      case 'confluence_get_templates':
        result = await confluenceClient.getTemplates(args?.spaceKey as string);
        break;
      case 'confluence_get_template':
        result = await confluenceClient.getTemplate(args?.templateId as string);
        break;

      // Watchers
      case 'confluence_get_watchers':
        result = await confluenceClient.getWatchers(args?.pageId as string);
        break;
      case 'confluence_add_watcher':
        result = await confluenceClient.addWatcher(
          args?.pageId as string,
          args?.username as string
        );
        break;
      case 'confluence_remove_watcher':
        result = await confluenceClient.removeWatcher(
          args?.pageId as string,
          args?.username as string
        );
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Register resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'confluence://spaces',
        mimeType: 'application/json',
        name: 'Confluence Spaces',
        description: 'List of all Confluence spaces',
      },
      {
        uri: 'confluence://current-user',
        mimeType: 'application/json',
        name: 'Current User',
        description: 'Current authenticated user information',
      },
    ],
  };
});

// Register resource read handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    let content: unknown;

    if (uri === 'confluence://spaces') {
      content = await confluenceClient.getSpaces();
    } else if (uri === 'confluence://current-user') {
      content = await confluenceClient.getCurrentUser();
    } else {
      throw new Error(`Unknown resource: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource ${uri}: ${errorMessage}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Confluence MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
