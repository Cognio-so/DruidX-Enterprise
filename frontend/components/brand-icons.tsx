import React from "react";
import { RiOpenaiFill } from "react-icons/ri";
import { SiOpenai, SiGooglegemini } from "react-icons/si";
import { FaRobot } from "react-icons/fa";
import { BiLogoMeta } from "react-icons/bi";
import { TbRouter } from "react-icons/tb";
import { FaXTwitter } from "react-icons/fa6";

interface IconProps {
  className?: string;
  size?: number;
}

// OpenAI Icon
export const OpenAIIcon = ({ className, size = 18 }: IconProps) => (
  <RiOpenaiFill className={className} size={size} style={{ color: '#10a37f' }} />
);

// OpenAI (Mini) Icon
export const OpenAIMiniIcon = ({ className, size = 16 }: IconProps) => (
  <SiOpenai className={className} size={size} style={{ color: '#10a37f' }} />
);

// Google Gemini Icon
export const GoogleIcon = ({ className, size = 16 }: IconProps) => (
  <SiGooglegemini className={className} size={size} style={{ color: '#4285f4' }} />
);

// Anthropic Icon - Official logo design
export const AnthropicIcon = ({ className, size = 16 }: IconProps) => (
  <svg 
    className={className} 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Anthropic logo - layered geometric shapes */}
    <path d="M12 2L2 7v5l10 5 10-5V7l-10-5z" fill="#D4A574" />
    <path d="M2 17l10 5 10-5v-5l-10 5-10-5v5z" fill="#D4A574" opacity="0.85" />
    <path d="M12 2v5l10 5V7l-10-5z" fill="#D4A574" opacity="0.7" />
    <path d="M12 7v5l10 5v-5l-10-5z" fill="#D4A574" opacity="0.55" />
  </svg>
);

// Meta Icon
export const MetaIcon = ({ className, size = 18 }: IconProps) => (
  <BiLogoMeta className={className} size={size} style={{ color: '#0081a2' }} />
);

// Groq Icon - Using X icon
export const GroqIcon = ({ className, size = 18 }: IconProps) => (
  <FaXTwitter className={className} size={size} style={{ color: '#6366f1' }} />
);

// DeepSeek Icon - Official logo design
export const DeepSeekIcon = ({ className, size = 16 }: IconProps) => (
  <svg 
    className={className} 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* DeepSeek logo - stylized geometric design */}
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#8B5CF6" />
    <path d="M2 12L12 17L22 12L12 7L2 12Z" fill="#8B5CF6" opacity="0.9" />
    <path d="M12 17L22 22L12 17V12L22 17L12 22V17Z" fill="#8B5CF6" opacity="0.75" />
    <path d="M12 2L2 7V12L12 17V12L2 7V2L12 7V2Z" fill="#8B5CF6" opacity="0.6" />
    <path d="M12 12L8 10L12 8L16 10L12 12Z" fill="#8B5CF6" opacity="0.4" />
  </svg>
);

// xAI (Grok) Icon - Using X icon
export const XAIIcon = ({ className, size = 18 }: IconProps) => (
  <FaXTwitter className={className} size={size} style={{ color: '#000000' }} />
);

// Moonshot AI (Kimi) Icon - Using robot icon as placeholder
export const MoonshotIcon = ({ className, size = 16 }: IconProps) => (
  <GroqIcon className={className} size={size}  />
);

// Router Icon (for auto models)
export const RouterIcon = ({ className, size = 18 }: IconProps) => (
  <TbRouter className={className} size={size} style={{ color: '#eab308' }} />
);

// Helper function to get the appropriate icon for a model
export const getModelIcon = (model: string, className?: string): React.ReactElement | null => {
  const iconClassName = className || "flex-shrink-0";
  const modelLower = model.toLowerCase();
  
  // Router/Auto models
  if (modelLower.includes('auto') || modelLower.includes('router')) {
    return <RouterIcon className={iconClassName} size={16} />;
  }
  
  // OpenAI models - GPT-4o uses filled icon, others use regular
  if (modelLower === 'gpt_4o' || modelLower === 'gpt-4o') {
    return <OpenAIIcon className={iconClassName} size={18} />;
  }
  if (modelLower.includes('gpt_4o') || modelLower.includes('gpt-4o-mini')) {
    return <OpenAIMiniIcon className={iconClassName} size={16} />;
  }
  if (model.startsWith('gpt_') || model.startsWith('o1_') || model.startsWith('o2_') || model.startsWith('o4_')) {
    return <OpenAIIcon className={iconClassName} size={18} />;
  }
  
  // Google Gemini models
  if (modelLower.includes('gemini') || model.startsWith('palm_') || model.startsWith('google_')) {
    return <GoogleIcon className={iconClassName} size={16} />;
  }
  
  // Anthropic Claude models
  if (modelLower.includes('claude') || model.startsWith('anthropic_')) {
    return <AnthropicIcon className={iconClassName} size={16} />;
  }
  
  // xAI (Grok) models - check before Groq
  if (model.startsWith('grok_') || modelLower.includes('grok') || modelLower.includes('x-ai')) {
    return <XAIIcon className={iconClassName} size={18} />;
  }
  
  // Groq models (check before Meta since both might have llama)
  if (model.startsWith('groq_') || modelLower.includes('groq')) {
    return <GroqIcon className={iconClassName} size={18} />;
  }
  
  // Moonshot AI (Kimi) models
  if (model.startsWith('kimi_') || modelLower.includes('kimi') || modelLower.includes('moonshot')) {
    return <MoonshotIcon className={iconClassName} size={16} />;
  }
  
  // Meta Llama models
  if (model.startsWith('meta_') || model.startsWith('llama_') || modelLower.includes('llama') || modelLower.includes('meta')) {
    return <MetaIcon className={iconClassName} size={18} />;
  }
  
  // DeepSeek models
  if (model.startsWith('deepseek_') || modelLower.includes('deepseek')) {
    return <DeepSeekIcon className={iconClassName} size={16} />;
  }
  
  return null;
};

