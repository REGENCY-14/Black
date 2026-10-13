"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ConfirmSheet } from "@/components/admin/parts";
import { EmptyPanel, ErrorPanel, ListSkeleton, PageHeader } from "@/components/admin/states";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useCreateCategory, useDeleteCategory, useMoveCategory, useRenameCategory } from "@/hooks/admin";
import { useCategories } from "@/hooks/api";
import type { Category } from "@/lib/api/types";

function CategoryRow({ c, index, total }: { c: Category; index: number; total: number }) {
  const { toast } = useToast();
  const rename = useRenameCategory();
  const move = useMoveCategory();
  const del = useDeleteCategory();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [confirm, setConfirm] = useState(false);

  const save = () =>
    rename.mutate(
      { id: c.id, name },
      {
        onSuccess: () => {
          setEditing(false);
          toast({ title: "Category renamed", tone: "success" });
        },
      },
    );

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0" data-testid="category-row">
      <div className="flex items-center gap-2">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Input
              aria-label={`Name for ${c.name}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <IconButton
              type="submit"
              aria-label="Save name"
              variant="primary"
              loading={rename.isPending}
              icon={<Check className="size-5" aria-hidden />}
            />
            <IconButton
              aria-label="Cancel rename"
              icon={<X className="size-5" aria-hidden />}
              onClick={() => {
                setEditing(false);
                setName(c.name);
                rename.reset();
              }}
            />
          </form>
        ) : (
          <>
            <p className="min-w-0 flex-1 truncate font-medium">{c.name}</p>
            <IconButton
              variant="ghost"
              aria-label={`Move ${c.name} up`}
              disabled={index === 0 || move.isPending}
              icon={<ArrowUp className="size-5" aria-hidden />}
              onClick={() => move.mutate({ id: c.id, direction: "up" })}
            />
            <IconButton
              variant="ghost"
              aria-label={`Move ${c.name} down`}
              disabled={index === total - 1 || move.isPending}
              icon={<ArrowDown className="size-5" aria-hidden />}
              onClick={() => move.mutate({ id: c.id, direction: "down" })}
            />
            <IconButton
              variant="ghost"
              aria-label={`Rename ${c.name}`}
              icon={<Pencil className="size-5" aria-hidden />}
              onClick={() => setEditing(true)}
            />
            <IconButton
              variant="ghost"
              aria-label={`Delete ${c.name}`}
              icon={<Trash2 className="size-5" aria-hidden />}
              onClick={() => setConfirm(true)}
            />
          </>
        )}
      </div>
      {rename.isError && editing && (
        <p role="alert" className="text-sm text-danger">
          {rename.error.message}
        </p>
      )}
      <ConfirmSheet
        open={confirm}
        onOpenChange={(o) => {
          setConfirm(o);
          if (!o) del.reset();
        }}
        title={`Delete ${c.name}?`}
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
        destructive
        loading={del.isPending}
        error={del.isError ? del.error.message : undefined}
        onConfirm={() =>
          del.mutate(c.id, {
            onSuccess: () => {
              setConfirm(false);
              toast({ title: "Category deleted", tone: "success" });
            },
          })
        }
      >
        <p>A category that still has products cannot be deleted. Move or delete those products first.</p>
      </ConfirmSheet>
    </li>
  );
}

export function CategoriesView() {
  const q = useCategories();
  const create = useCreateCategory();
  const [name, setName] = useState("");

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products so shoppers can browse. Order here is the order in the shop."
      />

      <Card as="section" aria-labelledby="add-cat" className="max-w-xl">
        <h2 id="add-cat" className="sr-only">
          Add a category
        </h2>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(name, { onSuccess: () => setName("") });
          }}
        >
          <Field label="New category" className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Garden and outdoor" />
          </Field>
          <Button type="submit" size="lg" loading={create.isPending} disabled={!name.trim()}>
            <Plus className="size-5" aria-hidden /> Add
          </Button>
        </form>
        {create.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {create.error.message}
          </p>
        )}
      </Card>

      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyPanel title="No categories yet" text="Add your first category above." />
      ) : (
        <Card className="max-w-xl">
          <ul aria-label="Categories" className="flex flex-col divide-y divide-line">
            {q.data.map((c, i) => (
              <CategoryRow key={c.id} c={c} index={i} total={q.data.length} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
