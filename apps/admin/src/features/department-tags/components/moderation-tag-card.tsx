"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  formatDepartmentTagCreator,
  formatDepartmentTagDateTime,
  formatDepartmentTagMergeTarget,
  formatDepartmentTagMeta,
  formatDepartmentTagSource,
  formatDepartmentTagStatus,
  getDepartmentTagStatusClassName,
} from "@/features/department-tags/format";
import { moderationRefreshableStatuses, submitDepartmentTagModerationRequestAsync } from "@/features/department-tags/moderation-client";
import type {
  DepartmentTagActionState,
  DepartmentTagMergeTarget,
  DepartmentTagRecord,
} from "@/features/department-tags/types";

type ModerationTagCardProps = {
  mergeTargets: DepartmentTagMergeTarget[];
  tag: DepartmentTagRecord;
};

const renderActionState = (state: DepartmentTagActionState) => {
  if (state.message === null) {
    return null;
  }

  return (
    <p className={state.tone === "success" ? "inline-success" : "inline-error"}>
      {state.message}
    </p>
  );
};

export const ModerationTagCard = ({ mergeTargets, tag }: ModerationTagCardProps) => {
  const router = useRouter();
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [mergeState, setMergeState] = useState<DepartmentTagActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [blockState, setBlockState] = useState<DepartmentTagActionState>({
    code: null,
    message: null,
    tone: "idle",
  });
  const [isMergePending, setIsMergePending] = useState<boolean>(false);
  const [isBlockPending, setIsBlockPending] = useState<boolean>(false);
  const availableTargets = useMemo(
    () => mergeTargets.filter((target) => target.id !== tag.id),
    [mergeTargets, tag.id]
  );
  const isPending = isMergePending || isBlockPending;

  const handleMergeSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (selectedTargetId.length === 0) {
      setMergeState({
        code: "TARGET_REQUIRED",
        message: "Select a canonical target before merging.",
        tone: "error",
      });
      return;
    }

    setIsMergePending(true);
    setMergeState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitDepartmentTagModerationRequestAsync(
        "/api/admin/department-tags/merge",
        {
          sourceTagId: tag.id,
          targetTagId: selectedTargetId,
        }
      );
      const nextState: DepartmentTagActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setMergeState(nextState);

      if (response.status !== null && moderationRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setMergeState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown merge request error.",
        tone: "error",
      });
    } finally {
      setIsMergePending(false);
    }
  };

  const handleBlockClick = async (): Promise<void> => {
    setIsBlockPending(true);
    setBlockState({
      code: null,
      message: null,
      tone: "idle",
    });

    try {
      const response = await submitDepartmentTagModerationRequestAsync(
        "/api/admin/department-tags/block",
        {
          tagId: tag.id,
        }
      );
      const nextState: DepartmentTagActionState = {
        code: response.status,
        message: response.message,
        tone: response.status === "SUCCESS" ? "success" : "error",
      };

      setBlockState(nextState);

      if (response.status !== null && moderationRefreshableStatuses.has(response.status)) {
        router.refresh();
      }
    } catch (error) {
      setBlockState({
        code: "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Unknown block request error.",
        tone: "error",
      });
    } finally {
      setIsBlockPending(false);
    }
  };

  return (
    <article className="panel moderation-card">
      <div className="stack-md">
        <div className="review-card-header">
          <div className="stack-sm">
            <div className="eyebrow">Needs moderation</div>
            <h3 className="section-title">{tag.title}</h3>
            <p className="muted-text">{formatDepartmentTagMeta(tag)}</p>
          </div>
          <div className="badge-group">
            <span className="status-pill">{formatDepartmentTagSource(tag.sourceType)}</span>
            <span className={getDepartmentTagStatusClassName(tag.status)}>
              {formatDepartmentTagStatus(tag.status)}
            </span>
          </div>
        </div>

        <dl className="detail-grid">
          <div className="detail-item">
            <dt className="field-label">Slug</dt>
            <dd>{tag.slug}</dd>
          </div>
          <div className="detail-item">
            <dt className="field-label">Created</dt>
            <dd>{formatDepartmentTagDateTime(tag.createdAt)}</dd>
          </div>
          <div className="detail-item">
            <dt className="field-label">Updated</dt>
            <dd>{formatDepartmentTagDateTime(tag.updatedAt)}</dd>
          </div>
          <div className="detail-item">
            <dt className="field-label">Creator</dt>
            <dd>{formatDepartmentTagCreator(tag)}</dd>
          </div>
        </dl>

        <form className="stack-sm" onSubmit={(event) => void handleMergeSubmit(event)}>
          <label className="field">
            <span className="field-label">Merge into active canonical tag</span>
            <select
              className="field-input"
              disabled={isPending || availableTargets.length === 0}
              onChange={(event) => setSelectedTargetId(event.target.value)}
              value={selectedTargetId}
            >
              <option value="">Select target</option>
              {availableTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {formatDepartmentTagMergeTarget(target.title, target.universityName, target.city)}
                </option>
              ))}
            </select>
          </label>

          <div className="moderation-actions">
            <button className="button button-primary" disabled={isPending || availableTargets.length === 0} type="submit">
              {isMergePending ? "Merging..." : "Merge tag"}
            </button>
            <button
              className="button button-danger"
              disabled={isPending}
              onClick={() => void handleBlockClick()}
              type="button"
            >
              {isBlockPending ? "Blocking..." : "Block tag"}
            </button>
          </div>

          {renderActionState(mergeState)}
          {renderActionState(blockState)}
        </form>
      </div>
    </article>
  );
};
