import type { AICustomization, ActionType } from './index'

// Actions that should receive style customization
const STYLEABLE_ACTIONS = new Set<string>(['explain', 'summarize', 'define'])

// Actions that produce machine-readable output and must not be styled
const MACHINE_ACTIONS = new Set<string>(['parse_equation', 'extract_terms'])

const TONE_INSTRUCTIONS: Record<string, string> = {
  standard: '',
  formal: 'Use a formal, professional tone throughout your response.',
  casual: 'Use a casual, conversational tone. Be friendly and approachable.',
  technical: 'Use precise technical language. Assume familiarity with domain terminology.',
  eli5: 'Explain as if to a 5-year-old, using simple words and analogies.',
  academic: 'Use an academic tone with structured argumentation and citations where relevant.',
}

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  concise: 'Keep your response to 1-2 short paragraphs.',
  standard: '',
  detailed: 'Provide a thorough, detailed response covering all aspects of the topic.',
}

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  prose: '',
  bullets: 'Format your response as bullet points.',
  step_by_step: 'Format your response as numbered steps.',
  qa: 'Format your response as a Q&A, anticipating follow-up questions.',
}

export function buildSystemPrompt(customization?: AICustomization): string {
  let prompt = 'You are a helpful AI assistant helping a user understand a PDF document.'

  // Add custom system prompt if enabled
  if (customization?.customSystemPrompt) {
    prompt += `\n\nUser instructions: ${customization.customSystemPrompt}`
  }

  // Add document-specific context
  if (customization?.documentContext) {
    prompt += `\n\nDocument context: ${customization.documentContext}`
  }

  return prompt
}

function getStyleInstructions(customization?: AICustomization): string {
  if (!customization) return ''

  const parts: string[] = []

  const tone = customization.tone || 'standard'
  if (TONE_INSTRUCTIONS[tone]) {
    parts.push(TONE_INSTRUCTIONS[tone])
  }

  const length = customization.responseLength || 'standard'
  if (LENGTH_INSTRUCTIONS[length]) {
    parts.push(LENGTH_INSTRUCTIONS[length])
  }

  const format = customization.responseFormat || 'prose'
  if (FORMAT_INSTRUCTIONS[format]) {
    parts.push(FORMAT_INSTRUCTIONS[format])
  }

  return parts.length > 0 ? '\n\n' + parts.join(' ') : ''
}

export function buildUserMessage(
  text: string,
  context: string | undefined,
  action: ActionType | string,
  customization?: AICustomization,
  customPromptTemplate?: string,
): string {
  // Custom action template: replace placeholders and skip built-in switch
  if (customPromptTemplate) {
    let prompt = customPromptTemplate
      .replace(/\{text\}/g, text)
      .replace(/\{context\}/g, context || '')

    // Apply style instructions to custom actions
    prompt += getStyleInstructions(customization)

    return prompt
  }

  // Machine-readable actions: fixed prompts, no styling
  if (MACHINE_ACTIONS.has(action)) {
    return buildMachinePrompt(text, action as ActionType)
  }

  // explain_fundamental: has its own format but can receive styling
  if (action === 'explain_fundamental') {
    let prompt = `Explain this concept using first principles, starting from the most fundamental ideas. Make any technical terms you use **bold** so they can be clicked for further explanation.

Keep the explanation concise but thorough. Focus on building understanding from the ground up.

Concept: "${text}"`
    if (context) {
      prompt += `\n\nContext from the document:\n"${context}"`
    }
    prompt += getStyleInstructions(customization)
    return prompt
  }

  // Standard styleable actions
  let prompt = ''

  switch (action) {
    case 'summarize':
      prompt = `Summarize the key points of this text:\n\n"${text}"`
      break
    case 'define':
      prompt = `Define and explain this term or concept:\n\n"${text}"`
      if (context) {
        prompt += `\n\nContext from the document:\n"${context}"`
      }
      break
    case 'explain':
    default:
      prompt = `Explain this text in simple terms:\n\n"${text}"`
      if (context) {
        prompt += `\n\nSurrounding context from the document:\n"${context}"`
      }
      break
  }

  // Apply style instructions for styleable actions
  if (STYLEABLE_ACTIONS.has(action)) {
    const styleInstructions = getStyleInstructions(customization)
    if (styleInstructions) {
      prompt += styleInstructions
    } else {
      prompt += '\n\nKeep your response concise but thorough.'
    }
  } else {
    prompt += '\n\nKeep your response concise but thorough.'
  }

  return prompt
}

function buildMachinePrompt(text: string, action: ActionType): string {
  switch (action) {
    case 'parse_equation':
      return `Analyze this mathematical equation or formula and extract its variables. Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "variables": [
    {"name": "variable_symbol", "description": "what it represents", "range": [min, max], "unit": "optional_unit"}
  ],
  "formula": "the equation in readable form",
  "compute": "JavaScript expression to compute the dependent variable, using variable names"
}

For example, for "F = ma":
{
  "variables": [
    {"name": "m", "description": "mass", "range": [0, 100], "unit": "kg"},
    {"name": "a", "description": "acceleration", "range": [0, 20], "unit": "m/s²"}
  ],
  "formula": "F = ma",
  "compute": "m * a"
}

Equation to analyze: "${text}"`

    case 'extract_terms':
      return `Extract the technical terms from this text that could benefit from further explanation. Return ONLY a JSON array of term objects (no markdown, no explanation):

[{"term": "technical_term", "description": "brief_description"}]

Text: "${text}"`

    default:
      return text
  }
}

export function getTemperature(customization?: AICustomization, providerDefault: number = 0.7): number {
  if (customization?.temperature != null) {
    return Math.max(0, Math.min(2, customization.temperature))
  }
  return providerDefault
}

export function getMaxTokens(customization?: AICustomization, providerDefault: number = 2048): number {
  if (customization?.maxTokens != null) {
    return Math.max(256, Math.min(8192, customization.maxTokens))
  }
  return providerDefault
}

export function getModel(_providerId: string, customization?: AICustomization, providerDefault: string = ''): string {
  if (customization?.model) {
    return customization.model
  }
  return providerDefault
}
