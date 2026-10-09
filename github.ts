export interface Project {
  name: string;
  languages: Array<{ color: string; name: string }>;
  description: string;
  homepageUrl: string;
  url: string;
  stargazerCount: number;
}
