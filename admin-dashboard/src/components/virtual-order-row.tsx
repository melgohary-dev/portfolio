"use client";

import { memo } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { OrderRow } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { ROW_HEIGHT } from "./grid-utils";

interface VirtualOrderRowProps {
  row: Row<OrderRow>;
  index: number;
  start: number;
  isActive: boolean;
  flexId: string | null;
  flexWidth: number;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>, index: number) => void;
  onActivate: (index: number) => void;
  rowElsRef: React.MutableRefObject<Map<number, HTMLTableRowElement>>;
}

export const VirtualOrderRow = memo(function VirtualOrderRow({
  row,
  index,
  start,
  isActive,
  flexId,
  flexWidth,
  onKeyDown,
  onActivate,
  rowElsRef,
}: VirtualOrderRowProps) {
  return (
    <tr
      key={row.id}
      ref={(el) => {
        const map = rowElsRef.current;
        if (el) map.set(index, el);
        else map.delete(index);
      }}
      role="row"
      aria-rowindex={index + 2}
      tabIndex={isActive ? 0 : -1}
      data-index={index}
      onKeyDown={(e) => onKeyDown(e, index)}
      onClick={() => onActivate(index)}
      onFocus={() => onActivate(index)}
      className={cn(
        "group absolute inset-x-0 top-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
        isActive &&
          "bg-blue-50/40 focus:bg-blue-50/60 dark:bg-blue-950/20 dark:focus:bg-blue-950/40",
        "focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500",
      )}
      style={{
        transform: `translateY(${start}px)`,
        height: ROW_HEIGHT,
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const pinned = cell.column.columnDef.meta?.pinned;
        return (
          <td
            key={cell.id}
            role="gridcell"
            className={cn(
              "border-b border-slate-100 px-5 py-0 text-slate-600 dark:border-slate-800 dark:text-slate-300",
              pinned === "left" &&
                "sticky z-10 start-0 bg-white group-hover:bg-slate-50/80 group-focus-within:bg-blue-50/40 dark:bg-slate-900 dark:group-hover:bg-slate-800/40 dark:group-focus-within:bg-blue-950/20",
              pinned === "right" &&
                "sticky z-10 end-0 bg-white text-end group-hover:bg-slate-50/80 group-focus-within:bg-blue-50/40 dark:bg-slate-900 dark:group-hover:bg-slate-800/40 dark:group-focus-within:bg-blue-950/20",
            )}
            style={{
              width:
                cell.column.id === flexId ? flexWidth : cell.column.getSize(),
              height: ROW_HEIGHT,
            }}
          >
            <div
              className={cn(
                "flex h-full items-center",
                pinned === "right" && "justify-end",
                cell.column.id === "id" &&
                  "font-medium text-slate-800 dark:text-slate-100",
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </td>
        );
      })}
    </tr>
  );
});
