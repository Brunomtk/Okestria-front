export type GitHubAuthState = "ready" | "missing-gh" | "unauthenticated";

export type GitHubPullRequestSummary = {
  number: number;
  title: string;
  url: string;
  repo: string;
  author: string;
  updatedAt: string | null;
  isDraft: boolean;
  labels: string[];
  reviewDecision: string | null;
  headRefName: string | null;
  baseRefName: string | null;
  statusSummary: string | null;
};

export type GitHubStatusCheck = {
  name: string;
  status: string | null;
  conclusion: string | null;
  workflow: string | null;
  detailsUrl: string | null;
};

export type GitHubReviewEntry = {
  author: string;
  state: string | null;
  body: string;
  submittedAt: string | null;
};

export type GitHubCommentEntry = {
  author: string;
  body: string;
  createdAt: string | null;
  url: string | null;
};

export type GitHubCommitEntry = {
  oid: string;
  messageHeadline: string;
  authoredDate: string | null;
};

export type GitHubFileEntry = {
  path: string;
  additions: number;
  deletions: number;
  status: string | null;
  previousPath: string | null;
  patch: string | null;
};

export type GitHubPullRequestDetail = GitHubPullRequestSummary & {
  body: string;
  state: string | null;
  mergeable: string | null;
  headRefOid: string | null;
  statusChecks: GitHubStatusCheck[];
  reviews: GitHubReviewEntry[];
  comments: GitHubCommentEntry[];
  commits: GitHubCommitEntry[];
  files: GitHubFileEntry[];
  diff: string;
  diffTruncated: boolean;
};

export type GitHubDashboardResponse = {
  ready: boolean;
  authState: GitHubAuthState;
  viewerLogin: string | null;
  currentRepoSlug: string | null;
  currentRepoPullRequests: GitHubPullRequestSummary[];
  reviewRequests: GitHubPullRequestSummary[];
  authoredPullRequests: GitHubPullRequestSummary[];
  message: string | null;
};

export type GitHubDetailResponse = {
  ready: boolean;
  authState: GitHubAuthState;
  viewerLogin: string | null;
  currentRepoSlug: string | null;
  pullRequest: GitHubPullRequestDetail | null;
  message: string | null;
};

export type GitHubReviewAction = "APPROVE" | "COMMENT" | "REQUEST_CHANGES";
export type GitHubInlineCommentSide = "LEFT" | "RIGHT";
