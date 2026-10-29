"use client";

import * as React from "react";
import { InboxIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

const buttonVariants: ButtonVariant[] = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
];

// Classes that force the look of a hover state, so it can be shown without a mouse
const forcedHover: Record<ButtonVariant, string> = {
  default: "bg-primary/90",
  outline: "bg-accent",
  secondary: "bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]",
  ghost: "bg-accent",
  destructive: "bg-destructive/90",
  link: "no-underline",
};

const forcedFocus = "ring-2 ring-ring ring-offset-2 ring-offset-background";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StateCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-base text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function ComponentsSandbox() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6">
      <Toaster />

      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">Components</h1>
        <p className="max-w-prose text-muted-foreground">
          Every shared part in every state. Hover and focus are forced with classes so they can be
          seen without a mouse. Use Tab to check the real focus ring.
        </p>
      </header>

      <Section title="Button">
        <div className="flex flex-col gap-8">
          {buttonVariants.map((variant) => (
            <div key={variant} className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold">{variant}</h3>
              <div className="flex flex-wrap items-end gap-6">
                <StateCell label="Normal">
                  <Button variant={variant}>Save</Button>
                </StateCell>
                <StateCell label="Hover">
                  <Button variant={variant} className={forcedHover[variant]}>
                    Save
                  </Button>
                </StateCell>
                <StateCell label="Focus">
                  <Button variant={variant} className={forcedFocus}>
                    Save
                  </Button>
                </StateCell>
                <StateCell label="Disabled">
                  <Button variant={variant} disabled>
                    Save
                  </Button>
                </StateCell>
                <StateCell label="Loading">
                  <Button variant={variant} disabled aria-busy="true">
                    <Loader2Icon aria-hidden="true" className="animate-spin" />
                    Saving
                  </Button>
                </StateCell>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Input and Textarea">
        <div className="grid gap-6 sm:grid-cols-2">
          <StateCell label="Normal">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="in-normal">College email</Label>
              <Input id="in-normal" type="email" placeholder="name@college.edu" />
            </div>
          </StateCell>
          <StateCell label="Focus">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="in-focus">College email</Label>
              <Input id="in-focus" type="email" className={forcedFocus} defaultValue="ajay@" />
            </div>
          </StateCell>
          <StateCell label="Disabled">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="in-disabled">College email</Label>
              <Input id="in-disabled" type="email" disabled defaultValue="name@college.edu" />
            </div>
          </StateCell>
          <StateCell label="Error">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="in-error">College email</Label>
              <Input
                id="in-error"
                type="email"
                aria-invalid="true"
                aria-describedby="in-error-msg"
                defaultValue="name@gmail.com"
              />
              <p id="in-error-msg" className="text-base text-destructive">
                Use your college email address. It ends with your college name.
              </p>
            </div>
          </StateCell>
          <StateCell label="Textarea: normal">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="ta-normal">About your project</Label>
              <Textarea id="ta-normal" placeholder="What are you building?" />
            </div>
          </StateCell>
          <StateCell label="Textarea: error">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="ta-error">About your project</Label>
              <Textarea id="ta-error" aria-invalid="true" aria-describedby="ta-error-msg" />
              <p id="ta-error-msg" className="text-base text-destructive">
                Tell us a little about your project. This field cannot be empty.
              </p>
            </div>
          </StateCell>
          <StateCell label="Textarea: disabled">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="ta-disabled">About your project</Label>
              <Textarea id="ta-disabled" disabled defaultValue="Locked while saving." />
            </div>
          </StateCell>
          <StateCell label="Loading">
            <div className="flex w-full flex-col gap-2" aria-busy="true">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-11 w-full" />
            </div>
          </StateCell>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Hackathon team</CardTitle>
              <CardDescription>Needs 2 more people. Closes on Friday.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Looking for a designer and a backend developer.</p>
            </CardContent>
            <CardFooter>
              <Button>Request to join</Button>
            </CardFooter>
          </Card>
          <Card aria-busy="true">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-11 w-40" />
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Selected</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Rejected</Badge>
        </div>
      </Section>

      <Section title="Dialog">
        <div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leave this team?</DialogTitle>
                <DialogDescription>
                  You can ask to join again later if the team still has space.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Stay</Button>
                </DialogClose>
                <Button variant="destructive">Leave team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast.success("Your profile was saved.")}>
            Success toast
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("We could not save your profile. Try again.")}
          >
            Error toast
          </Button>
          <Button variant="outline" onClick={() => toast.info("Your request was sent.")}>
            Info toast
          </Button>
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={<InboxIcon />}
          title="No team posts yet"
          description="Be the first to post. Say what you are building and who you need."
          action={<Button>Post a team request</Button>}
        />
      </Section>

      <Section title="Banner">
        <div className="flex flex-col gap-4">
          <Banner variant="info" title="Waiting for approval">
            Your college admin needs to approve your account before you can join.
          </Banner>
          <Banner variant="success" title="Profile saved">
            Your changes are live.
          </Banner>
          <Banner variant="warning" title="Almost full">
            This team has 1 place left.
          </Banner>
          <Banner variant="error" title="Could not load teams">
            Check your connection and try again. Request ID: abc-123.
          </Banner>
        </div>
      </Section>
    </main>
  );
}
