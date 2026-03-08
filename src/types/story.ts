export interface Story {
  id: string;
  title: string;
  content: string;
  category?: string;
  loop_enabled: boolean;
  schedule_time?: string;
  created_at: string;
}
