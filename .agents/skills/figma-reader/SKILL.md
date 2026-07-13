---
name: figma-reader
description: Read Figma designs, interpret design tokens or layout specifications, and translate them into React/Next.js/Tailwind code for the Zalo Mini App e-commerce project.
---

# Figma Reader Agent Skill

This skill allows the agent to read, parse, and translate Figma UI designs and screenshots into high-fidelity, responsive frontend components for Next.js and Zalo Mini App.

## Instruction Guide

When the user asks to implement a UI component or screen from Figma (e.g. by providing a Figma URL, Figma API JSON export, or screenshots of Figma designs), you must follow these structured translation guidelines:

### 1. Structure Analysis
- Map visual layouts into CSS Grid or Flexbox structures.
- Group elements logically into functional sub-components (e.g., `ProductCard`, `CartItem`, `Header`).
- Determine responsive behavior: Mobile-first layout designed for a 360px - 450px screen width (standard Zalo Mini App environment).

### 2. Design System & Theme Alignment
- Map Figma colors to the global Tailwind config or CSS variables (e.g. `--primary-color`, `--bg-color`).
- Align fonts, weights, and spacing units (use relative units like `rem` or Tailwind `px`/`rem` equivalents).
- Maintain Zalo Mini App brand guidelines if applicable (Zalo's iconic blue `#0068ff`, soft borders, modern inputs).

### 3. Component Generation Guidelines
- Always write components using TypeScript (`.tsx`).
- Provide clean, interactive hover/active states.
- Ensure all interactive elements have unique and descriptive `id` attributes.
- Example structure for code conversion:
  ```tsx
  import React from 'react';

  interface ComponentProps {
    // Props definition
  }

  export const ProductCard: React.FC<ComponentProps> = ({ ... }) => {
    return (
      <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
        {/* Figma Layout Translated */}
      </div>
    );
  };
  ```

## Reference Patterns

### Zalo Mini App UI Constrained Specs
- **Viewport**: Mini apps run in the Zalo webview container. Keep headers compact and account for safe area insets at the top and bottom.
- **Styling**: Prefer Tailwind CSS or vanilla CSS utility classes to keep bundle size small and load time quick.
