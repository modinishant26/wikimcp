# Confluence MCP Server

A Model Context Protocol (MCP) server for Atlassian Confluence Wiki (Self-Hosted), built with TypeScript and Node.js. Provides comprehensive tools for space management, page operations, search, labels, comments, attachments, and more.

## ✨ Features

- **Space Management**: List, get, create, and delete spaces
- **Page Operations**: Create, read, update, delete, and move pages
- **Search**: Search using CQL (Confluence Query Language) or text queries
- **Labels**: Add, remove, and search by labels
- **Comments**: Get and add comments on pages
- **Attachments**: List, get, and delete attachments
- **Version History**: View page history and retrieve specific versions
- **Users**: Search users and get user details
- **Templates**: List and retrieve page templates
- **Watchers**: Manage page watchers
- **Permissions**: View page restrictions

## 📋 Prerequisites

- Node.js 18+
- Self-hosted Confluence instance
- Personal Access Token (PAT) for authentication

## 🚀 Installation

### Using npm (Global)

```bash
npm install -g confluence-mcp
```

### From Source

```bash
git clone <repository-url>
cd wikimcp
npm install
npm run build
```

## ⚙️ Configuration

### Getting a Personal Access Token

1. Log into your Confluence instance
2. Go to **Profile** → **Personal Access Tokens**
3. Click **Create token**
4. Give it a name and set appropriate permissions
5. Copy the generated token

### Environment Variables

Create a `.env` file in the project root:

```env
CONFLUENCE_BASE_URL=https://your-confluence-instance.com
PAT=your-personal-access-token
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["/path/to/wikimcp/dist/index.js"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-confluence-instance.com",
        "PAT": "your-personal-access-token"
      }
    }
  }
}
```

Or if installed globally via npm:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "confluence-mcp",
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-confluence-instance.com",
        "PAT": "your-personal-access-token"
      }
    }
  }
}
```

## 📖 Usage

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🛠️ Available Tools (38 total)

### Connection
- `confluence_test_connection` - Test connection to Confluence API
- `confluence_get_current_user` - Get the current authenticated user

### Spaces
- `confluence_get_spaces` - List all spaces
- `confluence_get_space` - Get space details
- `confluence_create_space` - Create a new space
- `confluence_delete_space` - Delete a space

### Pages
- `confluence_get_page` - Get a page by ID
- `confluence_get_page_by_title` - Get a page by title within a space
- `confluence_get_pages` - List pages with filters
- `confluence_create_page` - Create a new page
- `confluence_update_page` - Update an existing page
- `confluence_delete_page` - Delete a page
- `confluence_move_page` - Move a page to different location
- `confluence_get_page_children` - Get child pages
- `confluence_get_page_ancestors` - Get ancestor pages (breadcrumb)

### Search
- `confluence_search` - Search using CQL
- `confluence_search_content` - Search by text query

### Labels
- `confluence_get_labels` - Get labels on content
- `confluence_add_labels` - Add labels to content
- `confluence_remove_label` - Remove a label
- `confluence_get_content_by_label` - Find content by label

### Comments
- `confluence_get_comments` - Get comments on a page
- `confluence_add_comment` - Add a comment to a page

### Attachments
- `confluence_get_attachments` - Get attachments on a page
- `confluence_get_attachment` - Get attachment details
- `confluence_delete_attachment` - Delete an attachment

### History
- `confluence_get_page_history` - Get page version history
- `confluence_get_page_version` - Get specific page version

### Users
- `confluence_search_users` - Search for users
- `confluence_get_user` - Get user details

### Permissions
- `confluence_get_page_restrictions` - Get page restrictions

### Templates
- `confluence_get_templates` - List available templates
- `confluence_get_template` - Get template details

### Watchers
- `confluence_get_watchers` - Get page watchers
- `confluence_add_watcher` - Add a watcher
- `confluence_remove_watcher` - Remove a watcher

## 📚 Resources

The server also exposes the following MCP resources:

- `confluence://spaces` - List of all Confluence spaces
- `confluence://current-user` - Current authenticated user info

## 🔍 Example CQL Queries

```cql
# Find all pages in a space
space = "MYSPACE" AND type = page

# Find pages modified in the last week
lastModified >= now("-1w")

# Find pages with a specific label
label = "documentation"

# Find pages created by a user
creator = "username"

# Full-text search
text ~ "search term"

# Combined query
space = "DEV" AND type = page AND label = "api" AND lastModified >= now("-30d")
```

## 🤝 Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your configuration
4. Run in development mode: `npm run dev`

### Building

```bash
npm run build
```

### Reporting Issues

Please include:
- Confluence version
- Node.js version
- Error messages
- Steps to reproduce

## 📄 License

MIT

## 🙏 Acknowledgments

- Built following the patterns from [BitbucketMCP](https://github.com/yogeshhrathod/BitbucketMCP1.0) and [JiraMCP](https://github.com/yogeshhrathod/JiraMCP)
- Uses the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- For Atlassian Confluence REST API documentation, see [Confluence REST API](https://developer.atlassian.com/server/confluence/confluence-rest-api-examples/)
