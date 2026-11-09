export interface FeedbackCampaignPayload {
  enabled?: boolean;
  version?: number;
  min_papers?: number;
  min_duration_seconds?: number;
  cooldown_days?: number;
  upi_id?: string;
  upi_name?: string;
  github_repo?: string;
}

export interface FeedbackSubmission {
  rating: number;
  campaign_version: number;
  comment?: string;
  tags?: string[];
  trigger_type: "paper_downloads" | "time_on_site" | "manual";
}

export interface SupportInteraction {
  action: "github_star" | "contribute" | "upi_intent" | "upi_qr_view" | "copy_upi_id";
  amount?: number;
  campaign_version: number;
}
