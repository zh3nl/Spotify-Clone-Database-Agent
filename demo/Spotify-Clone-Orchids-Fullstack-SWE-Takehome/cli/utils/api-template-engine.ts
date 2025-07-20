import { Logger } from './logger';
import { APIConfiguration, QueryStrategy, TransformPattern, HTTPMethod } from './api-config-resolver';

export interface TemplateContext {
  config: APIConfiguration;
  timestamp: string;
  projectName: string;
}

export class APITemplateEngine {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Generates complete API route code from configuration
   */
  generateAPICode(config: APIConfiguration): string {
    this.logger.info(` Generating API code for: ${config.endpoint}`);

    const context: TemplateContext = {
      config,
      timestamp: new Date().toISOString(),
      projectName: 'Spotify Clone Database Agent'
    };

    const code = this.buildAPICode(context);
    
    this.logger.success(` Generated ${code.length} characters of API code`);
    this.logger.info(` Includes: ${config.methods.join(', ')} methods`);
    
    return code;
  }

  /**
   * Builds the complete API code structure
   */
  private buildAPICode(context: TemplateContext): string {
    const { config } = context;
    
    const imports = this.generateImports();
    const getMethod = config.methods.includes('GET') ? this.generateGETMethod(config) : '';
    const postMethod = config.methods.includes('POST') ? this.generatePOSTMethod(config) : '';
    const deleteMethod = config.methods.includes('DELETE') ? this.generateDELETEMethod(config) : '';
    
    return `${imports}

${getMethod}
${postMethod}
${deleteMethod}`.trim();
  }

  /**
   * Generates import statements
   */
  private generateImports(): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';`;
  }

  /**
   * Generates GET method based on query strategy
   */
  private generateGETMethod(config: APIConfiguration): string {
    const queryLogic = this.generateQueryLogic(config);
    const transformLogic = this.generateTransformLogic(config);
    const errorMessage = this.getErrorMessage(config, 'fetching');

    return `export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '20';
    
    // ${this.getQueryDescription(config)}
    ${queryLogic}

    if (error) {
      console.error('${errorMessage}:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match frontend expectations  
    ${transformLogic}

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Unexpected error in GET ${config.endpoint}:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}`;
  }

  /**
   * Generates POST method based on table type
   */
  private generatePOSTMethod(config: APIConfiguration): string {
    const insertLogic = this.generateInsertLogic(config);
    const transformLogic = this.generateTransformLogic(config);
    const errorMessage = this.getErrorMessage(config, 'inserting');

    return `
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For demo purposes, insert the ${config.tableName.slice(0, -1)} data directly
    ${insertLogic}

    if (error) {
      console.error('${errorMessage}:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return transformed data to match frontend expectations
    ${transformLogic.replace('data?.map', 'const transformedData = {')}

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST ${config.endpoint}:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}`;
  }

  /**
   * Generates DELETE method if applicable
   */
  private generateDELETEMethod(config: APIConfiguration): string {
    if (!config.methods.includes('DELETE')) {
      return '';
    }

    const itemType = this.getItemType(config);
    const idField = this.getIdField(config);
    const additionalFilters = this.getDeleteFilters(config);

    return `
export async function DELETE(request: NextRequest) {
  try {
    const ${itemType}Id = request.nextUrl.searchParams.get('id');

    if (!${itemType}Id) {
      return NextResponse.json(
        { error: '${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('${config.tableName}')
      .delete()
      .eq('${idField}', ${itemType}Id)${additionalFilters};

    if (error) {
      console.error('${this.getErrorMessage(config, 'deleting')}:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE ${config.endpoint}:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}`;
  }

  /**
   * Generates query logic based on strategy
   */
  private generateQueryLogic(config: APIConfiguration): string {
    switch (config.queryStrategy) {
      case 'recent_order':
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(parseInt(limit));`;

      case 'filtered_personalized':
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .select('*')
      .eq('playlist_type', 'personalized')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));`;

      case 'popularity_order':
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .select('*')
      .order('popularity_score', { ascending: false })
      .limit(parseInt(limit));`;

      case 'simple_select':
      default:
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));`;
    }
  }

  /**
   * Generates insert logic for POST methods
   */
  private generateInsertLogic(config: APIConfiguration): string {
    switch (config.transformPattern) {
      case 'album_transform':
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .insert({
        album_id: body.albumId || body.id,
        title: body.title,
        artist: body.artist,
        image_url: body.albumArt,
        release_date: body.releaseDate || new Date().toISOString().split('T')[0],
        popularity_score: body.popularityScore || Math.floor(Math.random() * 20 + 80),
        genre: body.genre || 'Pop'
      })
      .select()
      .single();`;

      case 'playlist_transform':
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .insert({
        title: body.title,
        description: body.description || body.artist,
        image_url: body.albumArt,
        playlist_type: 'personalized',
        user_id: body.userId || 'default-user'
      })
      .select()
      .single();`;

      case 'track_transform':
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .insert({
        user_id: body.userId || 'default-user',
        track_id: body.trackId || body.id,
        track_name: body.title,
        artist_name: body.artist,
        album_name: body.album,
        image_url: body.albumArt,
        played_at: body.playedAt || new Date().toISOString(),
        duration_ms: (body.duration || 0) * 1000
      })
      .select()
      .single();`;

      default:
        return `const { data, error } = await supabase
      .from('${config.tableName}')
      .insert(body)
      .select()
      .single();`;
    }
  }

  /**
   * Generates transform logic for response data
   */
  private generateTransformLogic(config: APIConfiguration): string {
    switch (config.transformPattern) {
      case 'album_transform':
        return `const transformedData = data?.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.title, // Use title as album for albums
      albumArt: item.image_url || '/images/default-album.png',
      duration: item.duration || 0, // Default duration for albums
      popularityScore: item.popularity_score,
      releaseDate: item.release_date,
      genre: item.genre
    })) || [];`;

      case 'playlist_transform':
        return `const transformedData = data?.map(item => ({
      id: item.id,
      title: item.title,
      artist: item.description, // Using description as artist field for compatibility
      album: item.title, // Use title as album for playlists
      albumArt: item.image_url || '/images/default-playlist.png',
      duration: item.duration || 0, // Default duration for playlists
      playlistType: item.playlist_type
    })) || [];`;

      case 'track_transform':
        return `const transformedData = data?.map(item => ({
      id: item.id,
      title: item.track_name,
      artist: item.artist_name,
      album: item.album_name,
      albumArt: item.image_url || '/images/default-track.png',
      duration: Math.floor((item.duration_ms || 0) / 1000),
      playedAt: item.played_at
    })) || [];`;

      default:
        return `const transformedData = data || [];`;
    }
  }

  /**
   * Helper methods for generating contextual content
   */
  private getQueryDescription(config: APIConfiguration): string {
    switch (config.transformPattern) {
      case 'album_transform':
        return 'Fetch popular albums (simplified for demo - no auth required)';
      case 'playlist_transform':
        return 'Fetch made for you playlists (simplified for demo - no auth required)';
      case 'track_transform':
        return 'Fetch recently played tracks (simplified for demo - no auth required)';
      default:
        return `Fetch ${config.tableName} (simplified for demo - no auth required)`;
    }
  }

  private getErrorMessage(config: APIConfiguration, action: string): string {
    switch (config.transformPattern) {
      case 'album_transform':
        return `Error ${action} popular ${config.tableName.slice(0, -1)}`;
      case 'playlist_transform':
        return `Error ${action} made for you ${config.tableName.slice(0, -1)}`;
      case 'track_transform':
        return `Error ${action} recently played ${config.tableName.slice(0, -1)}`;
      default:
        return `Error ${action} ${config.tableName.slice(0, -1)}`;
    }
  }

  private getItemType(config: APIConfiguration): string {
    switch (config.transformPattern) {
      case 'album_transform':
        return 'album';
      case 'playlist_transform':
        return 'playlist';
      case 'track_transform':
        return 'track';
      default:
        return config.tableName.slice(0, -1);
    }
  }

  private getIdField(config: APIConfiguration): string {
    return 'id'; // All tables use 'id' as primary key
  }

  private getDeleteFilters(config: APIConfiguration): string {
    if (config.transformPattern === 'playlist_transform') {
      return `
      .eq('playlist_type', 'personalized')`;
    }
    return '';
  }
}