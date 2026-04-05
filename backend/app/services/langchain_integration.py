"""LangChain + LangChain-AWS integration for LegalGuard AI.

Provides:
- Bedrock Claude LLM via langchain-aws
- Bedrock Titan Embeddings via langchain-aws
- LangChain RAG chain with retriever
- NeMo Guardrails integration
"""

from __future__ import annotations

import logging
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class LangChainSettings(BaseSettings):
    """LangChain configuration from environment."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    llm_provider: str = "bedrock"  # bedrock | anthropic | typhoon | grok | ollama
    bedrock_model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    bedrock_embedding_model: str = "amazon.titan-embed-text-v2:0"
    aws_region: str = "ap-southeast-1"
    anthropic_api_key: str = ""
    typhoon_api_key: str = ""
    typhoon_base_url: str = "https://api.opentyphoon.ai/v1"
    typhoon_model: str = "typhoon-v2-70b-instruct"
    typhoon_embed_model: str = "typhoon-v2-embed-multilingual"
    grok_api_key: str = ""
    grok_base_url: str = "https://api.x.ai/v1"
    grok_model: str = "grok-3-mini"
    ollama_base_url: str = "http://localhost:11434"
    nemo_guardrails_enabled: bool = True


def get_bedrock_llm(settings: Optional[LangChainSettings] = None):
    """Get Bedrock Claude LLM via langchain-aws."""
    s = settings or LangChainSettings()
    try:
        from langchain_aws import ChatBedrock
        return ChatBedrock(
            model_id=s.bedrock_model_id,
            region_name=s.aws_region,
            model_kwargs={"temperature": 0.1, "max_tokens": 4096},
        )
    except ImportError:
        logger.warning("langchain-aws not installed, falling back to anthropic")
        return get_anthropic_llm(s)


def get_anthropic_llm(settings: Optional[LangChainSettings] = None):
    """Get Anthropic Claude LLM directly."""
    s = settings or LangChainSettings()
    from langchain_core.language_models import BaseChatModel
    try:
        from langchain_community.chat_models import ChatAnthropic
        return ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            anthropic_api_key=s.anthropic_api_key,
            temperature=0.1, max_tokens=4096,
        )
    except ImportError:
        logger.error("No LLM provider available")
        return None


def get_ollama_llm(settings: Optional[LangChainSettings] = None):
    """Get Ollama local LLM as fallback."""
    s = settings or LangChainSettings()
    try:
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(
            model="llama3.1", base_url=s.ollama_base_url,
            temperature=0.1,
        )
    except ImportError:
        logger.error("langchain-community not installed for Ollama")
        return None


def get_typhoon_llm(settings: Optional[LangChainSettings] = None):
    """Get Typhoon LLM (SCB 10X) via OpenAI-compatible API."""
    s = settings or LangChainSettings()
    if not s.typhoon_api_key:
        logger.warning("TYPHOON_API_KEY not set")
        return None
    try:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=s.typhoon_model,
            openai_api_key=s.typhoon_api_key,
            openai_api_base=s.typhoon_base_url,
            temperature=0.1,
            max_tokens=4096,
        )
    except ImportError:
        logger.warning("langchain-openai not installed for Typhoon")
        return None


def get_typhoon_embeddings(settings: Optional[LangChainSettings] = None):
    """Get Typhoon Embeddings (multilingual, Thai-optimized)."""
    s = settings or LangChainSettings()
    if not s.typhoon_api_key:
        logger.warning("TYPHOON_API_KEY not set for embeddings")
        return None
    try:
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            model=s.typhoon_embed_model,
            openai_api_key=s.typhoon_api_key,
            openai_api_base=s.typhoon_base_url,
        )
    except ImportError:
        logger.warning("langchain-openai not installed for Typhoon embeddings")
        return None


def get_grok_llm(settings: Optional[LangChainSettings] = None):
    """Get Grok LLM (xAI) via OpenAI-compatible API.

    Grok supports web search grounding — useful for ราชกิจจานุเบกษา lookups
    and real-time legal information retrieval.
    """
    s = settings or LangChainSettings()
    if not s.grok_api_key:
        logger.warning("GROK_API_KEY not set")
        return None
    try:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=s.grok_model,
            openai_api_key=s.grok_api_key,
            openai_api_base=s.grok_base_url,
            temperature=0.1,
            max_tokens=4096,
        )
    except ImportError:
        logger.warning("langchain-openai not installed for Grok")
        return None


def get_llm(settings: Optional[LangChainSettings] = None):
    """Get LLM based on provider setting with fallback chain.

    Fallback: Bedrock → Typhoon → Grok → Anthropic → Ollama
    """
    s = settings or LangChainSettings()
    if s.llm_provider == "bedrock":
        llm = get_bedrock_llm(s)
        if llm: return llm
    if s.llm_provider == "typhoon" or s.typhoon_api_key:
        llm = get_typhoon_llm(s)
        if llm: return llm
    if s.llm_provider == "grok" or s.grok_api_key:
        llm = get_grok_llm(s)
        if llm: return llm
    if s.llm_provider == "anthropic" or s.anthropic_api_key:
        llm = get_anthropic_llm(s)
        if llm: return llm
    return get_ollama_llm(s)


def get_bedrock_embeddings(settings: Optional[LangChainSettings] = None):
    """Get Bedrock Titan Embeddings via langchain-aws."""
    s = settings or LangChainSettings()
    try:
        from langchain_aws import BedrockEmbeddings
        return BedrockEmbeddings(
            model_id=s.bedrock_embedding_model,
            region_name=s.aws_region,
        )
    except ImportError:
        logger.warning("langchain-aws not installed for embeddings")
        return None


def create_rag_chain(llm=None, retriever=None):
    """Create a LangChain RAG chain with legal system prompt."""
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.runnables import RunnablePassthrough

    if not llm:
        llm = get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", """คุณเป็น "น้องซื่อสัตย์" ผู้ช่วย AI ด้านกฎหมายไทยของระบบ Smart LegalGuard AI

กฎ:
- ตอบโดยอ้างอิงจากบริบทที่ให้มาเท่านั้น
- อ้างอิงเลขคดีและมาตราที่เกี่ยวข้องเสมอ
- ถ้าไม่มีข้อมูลเพียงพอ ให้ตอบว่า "ไม่พบข้อมูลที่เกี่ยวข้อง กรุณาปรึกษาทนายความ"
- ใช้ภาษาไทยที่เข้าใจง่ายสำหรับประชาชน
- ลงท้ายด้วย disclaimer เสมอ

บริบท:
{context}"""),
        ("human", "{question}"),
    ])

    if retriever:
        chain = (
            {"context": retriever, "question": RunnablePassthrough()}
            | prompt | llm | StrOutputParser()
        )
    else:
        chain = prompt | llm | StrOutputParser()

    return chain


def apply_nemo_guardrails(chain, config_path: str = "app/guardrails"):
    """Wrap a LangChain chain with NeMo Guardrails."""
    try:
        from nemoguardrails import RailsConfig, LLMRails
        config = RailsConfig.from_path(config_path)
        rails = LLMRails(config)
        logger.info("NeMo Guardrails enabled for LegalGuard AI")
        return rails
    except ImportError:
        logger.warning("nemoguardrails not installed, returning chain without guardrails")
        return chain
    except Exception as e:
        logger.error("Failed to load NeMo Guardrails: %s", e)
        return chain
