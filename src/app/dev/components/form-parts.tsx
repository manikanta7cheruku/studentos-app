"use client";

import * as React from "react";
import { HomeIcon, SearchIcon, UserIcon, UsersIcon } from "lucide-react";

import { BottomNav } from "@/components/ui/bottom-nav";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorSummary } from "@/components/ui/error-summary";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const requests = [
  { id: "1", name: "Asha Rao", email: "asha@college.example", status: "Pending" },
  { id: "2", name: "Ravi Kumar", email: "ravi@college.example", status: "Approved" },
];

const navItems = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/team-finder", label: "Teams", icon: <UsersIcon /> },
  { href: "/opportunities", label: "Jobs", icon: <SearchIcon /> },
  { href: "/profile", label: "Profile", icon: <UserIcon /> },
];

export function FormPartsSections() {
  return (
    <>
      <Section title="FormField">
        <div className="grid gap-6 sm:grid-cols-2">
          <StateCell label="Normal">
            <FormField label="Full name" help="As shown on your college ID" className="w-full">
              <Input />
            </FormField>
          </StateCell>
          <StateCell label="Help text and required">
            <FormField
              id="sandbox-email"
              label="College email"
              help="Use the email your college gave you"
              required
              className="w-full"
            >
              <Input type="email" />
            </FormField>
          </StateCell>
          <StateCell label="Error">
            <FormField
              id="sandbox-code"
              label="Invite code"
              help="Ask your college for it"
              error="That code is not valid"
              className="w-full"
            >
              <Input defaultValue="ABC" />
            </FormField>
          </StateCell>
          <StateCell label="Disabled">
            <FormField label="College" help="Set by your invite code" className="w-full">
              <Input disabled defaultValue="Example College" />
            </FormField>
          </StateCell>
        </div>
      </Section>

      <Section title="ErrorSummary">
        <ErrorSummary
          errors={[
            { fieldId: "sandbox-email", message: "Enter a valid college email" },
            { fieldId: "sandbox-code", message: "Enter your invite code" },
          ]}
        />
        <p className="text-base text-muted-foreground">
          It takes focus when it appears. Each message links to its field.
        </p>
      </Section>

      <Section title="Select">
        <div className="grid gap-6 sm:grid-cols-2">
          <StateCell label="Normal">
            <FormField label="Year" className="w-full">
              <Select defaultValue="">
                <option value="" disabled>
                  Choose your year
                </option>
                <option value="1">First year</option>
                <option value="2">Second year</option>
              </Select>
            </FormField>
          </StateCell>
          <StateCell label="Error">
            <FormField label="Role" error="Choose a role" className="w-full">
              <Select defaultValue="">
                <option value="" disabled>
                  Choose a role
                </option>
                <option value="student">Student</option>
              </Select>
            </FormField>
          </StateCell>
          <StateCell label="Disabled">
            <FormField label="Department" className="w-full">
              <Select disabled>
                <option>Computer Science</option>
              </Select>
            </FormField>
          </StateCell>
        </div>
      </Section>

      <Section title="Checkbox">
        <div className="flex flex-col gap-4">
          <StateCell label="Normal">
            <CheckboxField label="I agree to be contacted and have read the Privacy Notice" />
          </StateCell>
          <StateCell label="Checked">
            <CheckboxField label="Remember this device" defaultChecked />
          </StateCell>
          <StateCell label="Error">
            <CheckboxField label="I agree to the Terms" error="You must agree to continue" />
          </StateCell>
          <StateCell label="Disabled">
            <CheckboxField label="Locked by your college" disabled />
          </StateCell>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="open">
          <TabsList aria-label="Team posts">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="mine">My posts</TabsTrigger>
            <TabsTrigger value="closed" disabled>
              Closed
            </TabsTrigger>
          </TabsList>
          <TabsContent value="open">
            <p className="text-base">Teams that are still looking for people.</p>
          </TabsContent>
          <TabsContent value="mine">
            <p className="text-base">Posts you made.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Bottom navigation (phones only)">
        <p className="text-base text-muted-foreground">
          Shown here inside a box on every screen size. In the app it is fixed to the bottom and
          hidden from 768px up.
        </p>
        <div className="relative h-24 overflow-hidden rounded-card border border-border">
          <BottomNav items={navItems} currentPath="/team-finder" className="absolute md:flex" />
        </div>
      </Section>

      <Section title="ResponsiveList (table on desktop, cards on phones)">
        <ResponsiveList
          caption="Join requests"
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "status", header: "Status" },
            {
              key: "action",
              header: "Action",
              cell: (row) => <Button variant="outline">Review {String(row.name)}</Button>,
            },
          ]}
          rows={requests}
          getRowKey={(row) => row.id}
        />
      </Section>
    </>
  );
}
