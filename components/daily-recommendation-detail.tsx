import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DailyContent } from "@/types";

interface DailyRecommendationDetailProps {
  open: boolean;
  content: DailyContent | null;
  onClose: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split("\n");
  const result: ReactNode[] = [];
  let currentSection: string[] = [];
  let inAllowedSection = false;

  const allowedSections = ["主题", "来源渠道", "原内容"];
  const excludedSections = ["问题", "选项", "解释"];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection.length > 0 && inAllowedSection) {
        const block = currentSection.join("\n");
        // 检查是否是列表
        if (block.startsWith("- ") || /^\d+\.\s/.test(block)) {
          const items = block.split("\n").map((line) => {
            if (line.startsWith("- ")) {
              return line.replace(/^-+\s?/, "").trim();
            }
            if (/^\d+\.\s/.test(line)) {
              return line.replace(/^\d+\.\s?/, "").trim();
            }
            return line.trim();
          }).filter(Boolean);
          
          if (block.startsWith("- ")) {
            result.push(
              <ul key={`block-${index}`} className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {items.map((item, itemIndex) => (
                  <li key={`item-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          } else {
            result.push(
              <ol key={`block-${index}`} className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {items.map((item, itemIndex) => (
                  <li key={`item-${itemIndex}`}>{item}</li>
                ))}
              </ol>
            );
          }
        } else {
          result.push(
            <p key={`block-${index}`} className="text-sm leading-6 text-slate-700">
              {block}
            </p>
          );
        }
        currentSection = [];
      }
      return;
    }

    // 检查是否是标题行
    const isTitle = trimmed.startsWith("#");
    const isExcluded = excludedSections.some((section) => trimmed.includes(section));
    const isAllowed = allowedSections.some((section) => trimmed.includes(section));

    if (isTitle) {
      // 处理之前的区块
      if (currentSection.length > 0 && inAllowedSection) {
        const block = currentSection.join("\n");
        // 检查是否是列表
        if (block.startsWith("- ") || /^\d+\.\s/.test(block)) {
          const items = block.split("\n").map((line) => {
            if (line.startsWith("- ")) {
              return line.replace(/^-+\s?/, "").trim();
            }
            if (/^\d+\.\s/.test(line)) {
              return line.replace(/^\d+\.\s?/, "").trim();
            }
            return line.trim();
          }).filter(Boolean);
          
          if (block.startsWith("- ")) {
            result.push(
              <ul key={`block-${index}`} className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {items.map((item, itemIndex) => (
                  <li key={`item-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          } else {
            result.push(
              <ol key={`block-${index}`} className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {items.map((item, itemIndex) => (
                  <li key={`item-${itemIndex}`}>{item}</li>
                ))}
              </ol>
            );
          }
        } else {
          result.push(
            <p key={`block-${index}`} className="text-sm leading-6 text-slate-700">
              {block}
            </p>
          );
        }
        currentSection = [];
      }

      if (isExcluded) {
        inAllowedSection = false;
        return;
      }

      if (isAllowed) {
        inAllowedSection = true;
        // 渲染标题
        if (trimmed.startsWith("### ")) {
          const text = trimmed.replace(/^###\s+/, "");
          result.push(
            <h3 key={`h3-${index}`} className="text-base font-semibold text-slate-900 mt-4 first:mt-0">
              {text}
            </h3>
          );
        } else if (trimmed.startsWith("## ")) {
          const text = trimmed.replace(/^##\s+/, "");
          result.push(
            <h2 key={`h2-${index}`} className="text-lg font-semibold text-slate-900 mt-4 first:mt-0">
              {text}
            </h2>
          );
        } else if (trimmed.startsWith("# ")) {
          const text = trimmed.replace(/^#\s+/, "");
          result.push(
            <h1 key={`h1-${index}`} className="text-xl font-semibold text-slate-900 mt-4 first:mt-0">
              {text}
            </h1>
          );
        }
        return;
      }
    }

    // 如果不在允许的区块中，跳过
    if (!inAllowedSection) {
      return;
    }

    // 检查是否是选项（A. B. C. D. E.）
    if (/^[a-eA-E][\.、]\s/.test(trimmed)) {
      return;
    }

    // 添加到当前区块
    currentSection.push(trimmed);
  });

  // 处理最后一个区块
  if (currentSection.length > 0 && inAllowedSection) {
    const block = currentSection.join("\n");
    // 检查是否是列表
    if (block.startsWith("- ") || /^\d+\.\s/.test(block)) {
      const items = block.split("\n").map((line) => {
        if (line.startsWith("- ")) {
          return line.replace(/^-+\s?/, "").trim();
        }
        if (/^\d+\.\s/.test(line)) {
          return line.replace(/^\d+\.\s?/, "").trim();
        }
        return line.trim();
      }).filter(Boolean);
      
      if (block.startsWith("- ")) {
        result.push(
          <ul key="block-final" className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        );
      } else {
        result.push(
          <ol key="block-final" className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>{item}</li>
            ))}
          </ol>
        );
      }
    } else {
      result.push(
        <p key="block-final" className="text-sm leading-6 text-slate-700">
          {block}
        </p>
      );
    }
  }

  return result.length > 0 ? result : [<p key="empty" className="text-sm text-slate-600">暂无内容</p>];
}

export default function DailyRecommendationDetail({
  open,
  content,
  onClose,
  onRegenerate,
  isRegenerating
}: DailyRecommendationDetailProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex w-full max-w-2xl max-h-[85vh] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* 固定头部 */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">每日推荐</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {content ? `${content.date} 今日推荐` : "今日推荐"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-amber-300 hover:text-amber-700"
                aria-label="关闭"
              >
                X
              </button>
            </div>

            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-5 md:p-6 space-y-4">
                {/* 主要内容 */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                  {content ? (
                    <div className="space-y-3">
                      {renderMarkdown(content.fullContent)}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">暂无内容，请稍后重试。</p>
                  )}
                </div>

                {/* 来源渠道（精简版） */}
                {content?.sources?.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">来源渠道</p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      基于以下平台实时抓取的真实热点：
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {content.sources.slice(0, 3).map((source) => (
                        <div key={source.name} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <p className="text-xs font-semibold text-slate-800">{source.name}</p>
                            </div>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
                            >
                              查看
                            </a>
                          </div>
                          <ul className="space-y-1">
                            {source.titles.slice(0, 5).map((title, index) => (
                              <li key={`${source.name}-${index}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-600">
                                <span className="mt-1.5 inline-flex h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                                <span className="line-clamp-1">{title}</span>
                              </li>
                            ))}
                          </ul>
                          {source.titles.length > 5 && (
                            <p className="mt-1.5 text-xs text-slate-400">还有 {source.titles.length - 5} 条...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 固定底部 */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white p-5 md:p-6">
              <p className="text-xs text-slate-500">内容仅供心理测试灵感参考。</p>
              {onRegenerate ? (
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRegenerating ? "生成中..." : "重新生成"}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
