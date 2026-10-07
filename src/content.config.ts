import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const color = z.enum(["accent", "blue", "green", "brown", "muted", "danger"]);

const line = z.object({ cmd: z.string(), ex: z.string() });

const nodeState = z.object({
  color: color.optional(),
  tag: z.string().optional(),
  sub: z.string().optional(),
});

const linkState = z.object({
  style: z.enum(["normal", "trunk"]).optional(),
  colors: z.array(color).optional(),
  label: z.string().optional(),
});

const ping = z.object({
  label: z.string(),
  path: z.array(z.string()).min(2),
  result: z.enum(["ok", "drop"]),
  tag: z.object({ link: z.string(), text: z.string() }).optional(),
  dropText: z.string().optional(),
  output: z.string(),
});

const step = z.object({
  title: z.string(),
  idea: z.string(),
  commands: z.record(z.string(), z.array(line)),
  verify: z.object({ cmd: z.string(), output: z.string() }).optional(),
  mistakes: z.array(z.string()).default([]),
  highlight: z.array(z.string()).default([]),
  state: z
    .object({
      nodes: z.record(z.string(), nodeState).default({}),
      links: z.record(z.string(), linkState).default({}),
    })
    .default({ nodes: {}, links: {} }),
  pings: z.array(ping).optional(),
  pingsTitle: z.string().optional(),
});

const labs = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/labs" }),
  schema: z.object({
    title: z.string(),
    category: z.enum(["switching", "routing", "services", "linux", "vpn"]),
    level: z.enum(["مبتدئ", "متوسط", "متقدم"]),
    minutes: z.number(),
    commandsCount: z.number().optional(),
    keywords: z.array(z.string()).default([]),
    order: z.number().default(100),
    status: z.enum(["available", "soon"]).default("soon"),
    platform: z.string().optional(),
    devices: z.string().optional(),
    summary: z
      .object({
        intro: z.string(),
        challenge: z.object({ q: z.string(), a: z.string() }).optional(),
        files: z.array(z.string()).default([]),
        short: z.object({ title: z.string(), href: z.string() }).optional(),
      })
      .optional(),
    legend: z.array(z.object({ label: z.string(), color })).default([]),
    topology: z
      .object({
        viewBox: z.string().default("0 0 720 350"),
        nodes: z.array(
          z.object({
            id: z.string(),
            x: z.number(),
            y: z.number(),
            label: z.string(),
            sub: z.string().default(""),
            kind: z.enum(["switch", "router", "server", "pc"]).default("pc"),
            tag: z.string().default(""),
          }),
        ),
        links: z.array(
          z.object({
            id: z.string(),
            from: z.string(),
            to: z.string(),
            fromPort: z.string().optional(),
            toPort: z.string().optional(),
            label: z.string().optional(),
          }),
        ),
      })
      .optional(),
    startStep: z.number().default(0),
    steps: z.array(step).default([]),
  }),
});

export const collections = { labs };
