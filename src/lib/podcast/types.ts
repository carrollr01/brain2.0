export interface RSSEpisode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration?: number;
  guid: string;
}

export interface PodcastFeed {
  title: string;
  description: string;
  episodes: RSSEpisode[];
}

export interface PodcastTranscript {
  podcastName: string;
  episodeTitle: string;
  publishedAt: string;
  transcript: string;
  audioUrl: string;
}
