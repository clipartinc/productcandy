"use client";

import {
  Page,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  Banner,
  Select,
  InlineStack,
} from "@shopify/polaris";
import { useState } from "react";
import { appBridgeFetch } from "@/lib/appBridgeFetch";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const SUBJECT_OPTIONS = [
  { label: "General question", value: "General question" },
  { label: "Bug report", value: "Bug report" },
  { label: "Feature request", value: "Feature request" },
  { label: "Billing", value: "Billing" },
  { label: "Other", value: "Other" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0].value);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});

  function validate() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Tell us who you are.";
    if (!email.trim()) {
      next.email = "We need an email so we can reply.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That doesn't look like a valid email.";
    }
    if (!message.trim()) next.message = "Add a message before sending.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setStatus({ kind: "sending" });
    try {
      const res = await appBridgeFetch("/api/app/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Send failed");
      }
      setStatus({ kind: "sent" });
      setName("");
      setEmail("");
      setSubject(SUBJECT_OPTIONS[0].value);
      setMessage("");
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Send failed",
      });
    }
  }

  const sending = status.kind === "sending";

  return (
    <Page
      title="Contact us"
      subtitle="Questions, feedback, or bug reports — we'll get back to you."
      backAction={{ content: "Home", url: "/app" }}
    >
      <BlockStack gap="400">
        {status.kind === "sent" && (
          <Banner
            tone="success"
            title="Message sent"
            onDismiss={() => setStatus({ kind: "idle" })}
          >
            <p>Thanks — we&apos;ll be in touch at the email you provided.</p>
          </Banner>
        )}
        {status.kind === "error" && (
          <Banner
            tone="critical"
            title="Couldn't send your message"
            onDismiss={() => setStatus({ kind: "idle" })}
          >
            <p>{status.message}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <TextField
              label="Your name"
              autoComplete="name"
              value={name}
              onChange={(v) => {
                setName(v);
                if (errors.name && v.trim()) {
                  setErrors({ ...errors, name: undefined });
                }
              }}
              error={errors.name}
              disabled={sending}
            />

            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (errors.email && v.trim()) {
                  setErrors({ ...errors, email: undefined });
                }
              }}
              error={errors.email}
              disabled={sending}
              helpText="We'll reply to this address."
            />

            <Select
              label="Subject"
              options={SUBJECT_OPTIONS}
              value={subject}
              onChange={setSubject}
              disabled={sending}
            />

            <TextField
              label="Message"
              autoComplete="off"
              multiline={6}
              value={message}
              onChange={(v) => {
                setMessage(v);
                if (errors.message && v.trim()) {
                  setErrors({ ...errors, message: undefined });
                }
              }}
              error={errors.message}
              disabled={sending}
              placeholder="What can we help with?"
            />

            <InlineStack align="end">
              <Button
                variant="primary"
                size="large"
                loading={sending}
                onClick={submit}
              >
                Send message
              </Button>
            </InlineStack>

            <Text as="p" tone="subdued">
              Prefer email? Reach us at{" "}
              <a href="mailto:support@vectorize.com">
                support@vectorize.com
              </a>
              .
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
