import axios, { AxiosInstance, AxiosError } from 'axios';

export interface ConfluenceConfig {
  baseUrl: string;
  pat: string;
}

export interface Space {
  id: number;
  key: string;
  name: string;
  type: string;
  status: string;
  _links: {
    webui: string;
    self: string;
  };
}

export interface Page {
  id: string;
  type: string;
  status: string;
  title: string;
  space?: Space;
  version?: {
    number: number;
    when: string;
    by: {
      username: string;
      displayName: string;
    };
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  ancestors?: Page[];
  children?: {
    page?: {
      results: Page[];
    };
  };
  _links: {
    webui: string;
    self: string;
    tinyui?: string;
  };
}

export interface SearchResult {
  results: Array<{
    content: Page;
    title: string;
    excerpt: string;
    url: string;
    resultGlobalContainer: {
      title: string;
      displayUrl: string;
    };
  }>;
  start: number;
  limit: number;
  size: number;
  totalSize: number;
  _links: {
    base: string;
    context: string;
  };
}

export interface Label {
  prefix: string;
  name: string;
  id: string;
}

export interface Attachment {
  id: string;
  type: string;
  status: string;
  title: string;
  metadata: {
    mediaType: string;
    comment?: string;
  };
  extensions: {
    mediaType: string;
    fileSize: number;
  };
  _links: {
    webui: string;
    download: string;
    self: string;
  };
}

export interface Comment {
  id: string;
  type: string;
  status: string;
  title: string;
  body: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  version: {
    number: number;
    when: string;
    by: {
      username: string;
      displayName: string;
    };
  };
}

export interface User {
  type: string;
  username: string;
  userKey: string;
  displayName: string;
  email?: string;
}

export class ConfluenceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: ConfluenceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/api`,
      headers: {
        'Authorization': `Bearer ${config.pat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; statusCode?: number }>;
      const message = axiosError.response?.data?.message || axiosError.message;
      const status = axiosError.response?.status;
      throw new Error(`Confluence API Error (${status}): ${message}`);
    }
    throw error;
  }

  // ==================== Connection ====================
  
  async testConnection(): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const response = await this.client.get('/user/current');
      return {
        success: true,
        user: response.data,
        message: `Connected as ${response.data.displayName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: this.handleError(error),
      };
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.client.get('/user/current');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Spaces ====================

  async getSpaces(params?: { 
    start?: number; 
    limit?: number; 
    type?: string;
    status?: string;
  }): Promise<{ results: Space[]; start: number; limit: number; size: number }> {
    try {
      const response = await this.client.get('/space', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getSpace(spaceKey: string, expand?: string[]): Promise<Space> {
    try {
      const response = await this.client.get(`/space/${spaceKey}`, {
        params: { expand: expand?.join(',') },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createSpace(params: {
    key: string;
    name: string;
    description?: string;
    type?: 'global' | 'personal';
  }): Promise<Space> {
    try {
      const body: Record<string, unknown> = {
        key: params.key,
        name: params.name,
        type: params.type || 'global',
      };
      
      if (params.description) {
        body.description = {
          plain: {
            value: params.description,
            representation: 'plain',
          },
        };
      }
      
      const response = await this.client.post('/space', body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteSpace(spaceKey: string): Promise<{ success: boolean }> {
    try {
      await this.client.delete(`/space/${spaceKey}`);
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Pages ====================

  async getPage(pageId: string, expand?: string[]): Promise<Page> {
    try {
      const defaultExpand = ['body.storage', 'version', 'space', 'ancestors'];
      const response = await this.client.get(`/content/${pageId}`, {
        params: { expand: (expand || defaultExpand).join(',') },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPageByTitle(spaceKey: string, title: string, expand?: string[]): Promise<Page | null> {
    try {
      const defaultExpand = ['body.storage', 'version', 'space'];
      const response = await this.client.get('/content', {
        params: {
          spaceKey,
          title,
          expand: (expand || defaultExpand).join(','),
        },
      });
      return response.data.results[0] || null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPages(params: {
    spaceKey?: string;
    title?: string;
    type?: string;
    status?: string;
    start?: number;
    limit?: number;
    expand?: string[];
  }): Promise<{ results: Page[]; start: number; limit: number; size: number }> {
    try {
      const response = await this.client.get('/content', {
        params: {
          ...params,
          type: params.type || 'page',
          expand: params.expand?.join(','),
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createPage(params: {
    spaceKey: string;
    title: string;
    content: string;
    parentId?: string;
    contentFormat?: 'storage' | 'wiki';
  }): Promise<Page> {
    try {
      const body: Record<string, unknown> = {
        type: 'page',
        title: params.title,
        space: { key: params.spaceKey },
        body: {
          storage: {
            value: params.content,
            representation: params.contentFormat || 'storage',
          },
        },
      };

      if (params.parentId) {
        body.ancestors = [{ id: params.parentId }];
      }

      const response = await this.client.post('/content', body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updatePage(params: {
    pageId: string;
    title: string;
    content: string;
    version: number;
    contentFormat?: 'storage' | 'wiki';
  }): Promise<Page> {
    try {
      const body = {
        type: 'page',
        title: params.title,
        version: { number: params.version + 1 },
        body: {
          storage: {
            value: params.content,
            representation: params.contentFormat || 'storage',
          },
        },
      };

      const response = await this.client.put(`/content/${params.pageId}`, body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deletePage(pageId: string): Promise<{ success: boolean }> {
    try {
      await this.client.delete(`/content/${pageId}`);
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  async movePage(params: {
    pageId: string;
    targetSpaceKey?: string;
    targetParentId?: string;
    position?: 'append' | 'before' | 'after';
  }): Promise<Page> {
    try {
      const page = await this.getPage(params.pageId);
      
      const body: Record<string, unknown> = {
        type: 'page',
        title: page.title,
        version: { number: (page.version?.number || 0) + 1 },
      };

      if (params.targetSpaceKey) {
        body.space = { key: params.targetSpaceKey };
      }

      if (params.targetParentId) {
        body.ancestors = [{ id: params.targetParentId }];
      }

      const response = await this.client.put(`/content/${params.pageId}`, body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPageChildren(pageId: string, params?: {
    start?: number;
    limit?: number;
    expand?: string[];
  }): Promise<{ results: Page[]; start: number; limit: number; size: number }> {
    try {
      const response = await this.client.get(`/content/${pageId}/child/page`, {
        params: {
          ...params,
          expand: params?.expand?.join(','),
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPageAncestors(pageId: string): Promise<Page[]> {
    try {
      const page = await this.getPage(pageId, ['ancestors']);
      return page.ancestors || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Search ====================

  async search(params: {
    cql: string;
    start?: number;
    limit?: number;
    expand?: string[];
  }): Promise<SearchResult> {
    try {
      const response = await this.client.get('/content/search', {
        params: {
          cql: params.cql,
          start: params.start,
          limit: params.limit,
          expand: params.expand?.join(','),
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async searchContent(params: {
    query: string;
    spaceKey?: string;
    type?: string;
    start?: number;
    limit?: number;
  }): Promise<SearchResult> {
    try {
      let cql = `text ~ "${params.query}"`;
      
      if (params.spaceKey) {
        cql += ` AND space = "${params.spaceKey}"`;
      }
      
      if (params.type) {
        cql += ` AND type = "${params.type}"`;
      }

      return this.search({
        cql,
        start: params.start,
        limit: params.limit,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Labels ====================

  async getLabels(contentId: string): Promise<{ results: Label[] }> {
    try {
      const response = await this.client.get(`/content/${contentId}/label`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addLabels(contentId: string, labels: string[]): Promise<{ results: Label[] }> {
    try {
      const body = labels.map(name => ({ prefix: 'global', name }));
      const response = await this.client.post(`/content/${contentId}/label`, body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeLabel(contentId: string, label: string): Promise<{ success: boolean }> {
    try {
      await this.client.delete(`/content/${contentId}/label/${label}`);
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  async getContentByLabel(label: string, params?: {
    spaceKey?: string;
    start?: number;
    limit?: number;
  }): Promise<{ results: Page[]; start: number; limit: number; size: number }> {
    try {
      let cql = `label = "${label}"`;
      if (params?.spaceKey) {
        cql += ` AND space = "${params.spaceKey}"`;
      }
      
      const response = await this.search({
        cql,
        start: params?.start,
        limit: params?.limit,
      });
      
      return {
        results: response.results.map(r => r.content),
        start: response.start,
        limit: response.limit,
        size: response.size,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Comments ====================

  async getComments(pageId: string, params?: {
    start?: number;
    limit?: number;
    expand?: string[];
  }): Promise<{ results: Comment[]; start: number; limit: number; size: number }> {
    try {
      const defaultExpand = ['body.storage', 'version'];
      const response = await this.client.get(`/content/${pageId}/child/comment`, {
        params: {
          ...params,
          expand: (params?.expand || defaultExpand).join(','),
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addComment(pageId: string, content: string): Promise<Comment> {
    try {
      const body = {
        type: 'comment',
        container: { id: pageId, type: 'page' },
        body: {
          storage: {
            value: content,
            representation: 'storage',
          },
        },
      };

      const response = await this.client.post('/content', body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Attachments ====================

  async getAttachments(pageId: string, params?: {
    start?: number;
    limit?: number;
    filename?: string;
    mediaType?: string;
  }): Promise<{ results: Attachment[]; start: number; limit: number; size: number }> {
    try {
      const response = await this.client.get(`/content/${pageId}/child/attachment`, {
        params,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAttachment(attachmentId: string): Promise<Attachment> {
    try {
      const response = await this.client.get(`/content/${attachmentId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteAttachment(attachmentId: string): Promise<{ success: boolean }> {
    try {
      await this.client.delete(`/content/${attachmentId}`);
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Page History ====================

  async getPageHistory(pageId: string, params?: {
    start?: number;
    limit?: number;
  }): Promise<{ results: Array<{ number: number; when: string; by: User; message?: string }> }> {
    try {
      const response = await this.client.get(`/content/${pageId}/history`, {
        params,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPageVersion(pageId: string, version: number): Promise<Page> {
    try {
      const response = await this.client.get(`/content/${pageId}`, {
        params: {
          version,
          expand: 'body.storage,version,space',
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Users ====================

  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await this.client.get('/search/user', {
        params: { cql: `user.fullname ~ "${query}" OR user.name ~ "${query}"` },
      });
      return response.data.results || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getUser(username: string): Promise<User> {
    try {
      const response = await this.client.get('/user', {
        params: { username },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Page Permissions ====================

  async getPageRestrictions(pageId: string): Promise<{
    read: { restrictions: { user: User[]; group: Array<{ name: string }> } };
    update: { restrictions: { user: User[]; group: Array<{ name: string }> } };
  }> {
    try {
      const response = await this.client.get(`/content/${pageId}/restriction`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Blueprints/Templates ====================

  async getTemplates(spaceKey?: string): Promise<{ results: Array<{ templateId: string; name: string; description: string }> }> {
    try {
      const params = spaceKey ? { spaceKey } : {};
      const response = await this.client.get('/template/page', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getTemplate(templateId: string): Promise<{ templateId: string; name: string; body: { storage: { value: string } } }> {
    try {
      const response = await this.client.get(`/template/${templateId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ==================== Watchers ====================

  async getWatchers(pageId: string): Promise<{ watchers: User[] }> {
    try {
      const response = await this.client.get(`/content/${pageId}/notification/child-created`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addWatcher(pageId: string, username: string): Promise<{ success: boolean }> {
    try {
      await this.client.post(`/user/watch/content/${pageId}`, null, {
        params: { username },
      });
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeWatcher(pageId: string, username: string): Promise<{ success: boolean }> {
    try {
      await this.client.delete(`/user/watch/content/${pageId}`, {
        params: { username },
      });
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
