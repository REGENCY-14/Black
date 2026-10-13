"use client";

import { Plus, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { ConfirmSheet, initials } from "@/components/admin/parts";
import { EmptyPanel, ErrorPanel, ListSkeleton, PageHeader } from "@/components/admin/states";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useCreateStaff, useSession, useSetStaffActive, useStaff } from "@/hooks/admin";
import type { StaffUser } from "@/lib/api/types";

function StaffRow({ u, isMe }: { u: StaffUser; isMe: boolean }) {
  const { toast } = useToast();
  const setActive = useSetStaffActive();
  const [confirm, setConfirm] = useState(false);

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" data-testid="staff-row">
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-subtle text-sm font-semibold"
        aria-hidden
      >
        {initials(u.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{u.name}</p>
        <p className="truncate text-sm text-fg-muted">{u.email}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge tone={u.role === "owner" ? "accent" : "neutral"}>
            {u.role === "owner" ? "Owner" : "Ghana staff"}
          </Badge>
          <Badge tone={u.active ? "success" : "warning"}>{u.active ? "Active" : "Disabled"}</Badge>
        </div>
      </div>
      {u.role !== "owner" && !isMe && (
        <Button
          variant="secondary"
          size="sm"
          loading={setActive.isPending && !confirm}
          aria-label={`${u.active ? "Disable" : "Enable"} ${u.name}`}
          onClick={() =>
            u.active
              ? setConfirm(true)
              : setActive.mutate(
                  { id: u.id, active: true },
                  { onSuccess: () => toast({ title: `${u.name} can sign in again`, tone: "success" }) },
                )
          }
        >
          {u.active ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
          {u.active ? "Disable" : "Enable"}
        </Button>
      )}
      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={`Disable ${u.name}?`}
        confirmLabel="Yes, disable"
        cancelLabel="Keep active"
        destructive
        loading={setActive.isPending}
        error={setActive.isError ? setActive.error.message : undefined}
        onConfirm={() =>
          setActive.mutate(
            { id: u.id, active: false },
            {
              onSuccess: () => {
                setConfirm(false);
                toast({ title: `${u.name} is disabled`, tone: "success" });
              },
            },
          )
        }
      >
        <p>They will be signed out and cannot sign in until you enable them again.</p>
      </ConfirmSheet>
    </li>
  );
}

function AddStaff() {
  const { toast } = useToast();
  const create = useCreateStaff();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Add staff login
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) create.reset();
        }}
        title="Add a Ghana staff login"
        description="They can view orders, confirm payments, update status and move batches. They cannot see products, prices, categories or staff."
        confirmLabel="Create login"
        cancelLabel="Cancel"
        loading={create.isPending}
        error={create.isError ? create.error.message : undefined}
        onConfirm={() =>
          create.mutate(
            { name, email, password },
            {
              onSuccess: (u) => {
                setOpen(false);
                setName("");
                setEmail("");
                setPassword("");
                toast({ title: `Login created for ${u.name}`, tone: "success" });
              },
            },
          )
        }
      >
        <Field label="Full name">
          <Input autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" hint="At least 6 characters. Share it with them privately.">
          <Input
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </ConfirmSheet>
    </>
  );
}

export function StaffView() {
  const me = useSession().data?.user.id;
  const q = useStaff();
  return (
    <>
      <PageHeader
        title="Staff"
        description="Give the person in Ghana a login with limited access."
        actions={<AddStaff />}
      />
      {q.isPending ? (
        <ListSkeleton rows={2} />
      ) : q.isError ? (
        <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyPanel title="No logins yet" />
      ) : (
        <Card className="max-w-2xl">
          <ul aria-label="Staff" className="flex flex-col divide-y divide-line">
            {q.data.map((u) => (
              <StaffRow key={u.id} u={u} isMe={u.id === me} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
