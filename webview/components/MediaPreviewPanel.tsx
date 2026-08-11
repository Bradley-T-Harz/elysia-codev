import * as React from "react";
import type { FileReadPreview, WebviewState } from "../types";

type Props = {
  filePreview: FileReadPreview;
  operation: WebviewState["coding"]["mediaOperation"];
  busyAction: WebviewState["coding"]["busyAction"];
  onInspect: () => void;
  onThumbnail: () => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function shortFacts(value: Record<string, unknown>): string {
  return Object.entries(value)
    .slice(0, 6)
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join(" · ") || "not surfaced";
}

export default function MediaPreviewPanel({ filePreview, operation, busyAction, onInspect, onThumbnail }: Props) {
  const result = operation?.thumbnailPreview ?? operation?.inspectPreview ?? filePreview;
  const initialSummary = asRecord(filePreview.parse_summary);
  const resultSummary = asRecord(result.parse_summary);
  const descriptor = asRecord(result.descriptor ?? resultSummary.descriptor ?? initialSummary.descriptor);
  const family = String(result.media_family ?? resultSummary.media_family ?? initialSummary.media_family ?? descriptor.media_family ?? "unknown");
  const audio = asRecord(result.audio ?? resultSummary.audio ?? initialSummary.audio);
  const video = asRecord(result.video ?? resultSummary.video ?? initialSummary.video);
  const privacy = asRecord(result.privacy_flags ?? resultSummary.privacy_flags ?? initialSummary.privacy_flags);
  const safety = asRecord(result.safety_flags ?? resultSummary.safety_flags ?? initialSummary.safety_flags);
  const dependencies = asRecord(result.dependencies ?? resultSummary.dependencies ?? initialSummary.dependencies);
  const ffprobe = asRecord(dependencies.ffprobe);
  const ffmpeg = asRecord(dependencies.ffmpeg);
  const thumbnail = result.thumbnail_data_url ?? asRecord(result.preview).thumbnail_data_url;
  const canThumbnail = family === "video" && descriptor.thumbnail_capable !== false;

  return (
    <div className="document-preview">
      <div className="document-preview__head">
        <div>
          <strong>{String(descriptor.label ?? result.file_type_label ?? "Media file")}</strong>
          <p className="muted">local metadata stewardship · {family} · status {result.status}</p>
        </div>
        <span className="pill">read-only</span>
      </div>
      {typeof thumbnail === "string" ? (
        <img className="visual-thumbnail" src={thumbnail} alt="Locally derived video thumbnail" />
      ) : null}
      <dl className="facts facts--single">
        <div><dt>Container</dt><dd>{result.container ?? String(resultSummary.container ?? initialSummary.container ?? "unknown")}</dd></div>
        <div><dt>Duration</dt><dd>{String(result.duration_seconds ?? resultSummary.duration_seconds ?? initialSummary.duration_seconds ?? "unknown")} seconds</dd></div>
        <div><dt>Bitrate</dt><dd>{String(result.bitrate_bps ?? resultSummary.bitrate_bps ?? initialSummary.bitrate_bps ?? "unknown")} bps</dd></div>
        <div><dt>Streams</dt><dd>{String(result.stream_count ?? resultSummary.stream_count ?? initialSummary.stream_count ?? "unknown")}</dd></div>
        <div><dt>Audio</dt><dd>{shortFacts(audio)}</dd></div>
        <div><dt>Video</dt><dd>{shortFacts(video)}</dd></div>
        <div><dt>Privacy flags</dt><dd>{shortFacts(privacy)}</dd></div>
        <div><dt>Safety flags</dt><dd>{shortFacts(safety)}</dd></div>
        <div><dt>Dependencies</dt><dd>ffprobe {ffprobe.available === true ? "available" : "unavailable"} · ffmpeg {ffmpeg.available === true ? "available" : "unavailable"}</dd></div>
        <div><dt>Approval</dt><dd>explicit operator action · no mutation authority</dd></div>
        <div><dt>Trace</dt><dd>request {result.request_id ?? "not returned"} · operation {result.operation_id ?? "not returned"} · audit {result.audit_written ? "persisted" : "not returned"}</dd></div>
      </dl>
      <div className="button-row">
        <button className="ghost" disabled={busyAction === "mediaInspect"} onClick={onInspect}>
          {busyAction === "mediaInspect" ? "Inspecting..." : "Inspect media metadata"}
        </button>
        {canThumbnail ? (
          <button className="ghost" disabled={busyAction === "mediaThumbnail"} onClick={onThumbnail}>
            {busyAction === "mediaThumbnail" ? "Deriving..." : "Derive safe video thumbnail"}
          </button>
        ) : null}
      </div>
      {result.blocked_reason ? <p className="error-note">Blocked: {result.blocked_reason}</p> : null}
      {operation?.lastError ? <p className="error-note">{operation.lastError}</p> : null}
      <p className="muted">
        Raw media and embedded tag values are not shown or audited. Transcription, TTS, voice generation/cloning,
        transcoding, mutation, image generation, and video generation are not live in this slice.
      </p>
    </div>
  );
}
