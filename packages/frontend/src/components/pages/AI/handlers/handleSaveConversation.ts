import { Conversation, ExtendedChatMessage } from "@banbury/core/src/types";

export const saveConversation = (messages: ExtendedChatMessage[], currentConversation: Conversation | null, setCurrentConversation: (conversation: Conversation | null) => void) => {
    if (messages.length === 0) return;

    const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '');
    const lastMessage = messages[messages.length - 1].content.slice(0, 100) +
      (messages[messages.length - 1].content.length > 100 ? '...' : '');

    const conversation: Conversation = {
      id: currentConversation?.id || crypto.randomUUID(),
      title,
      lastMessage,
      timestamp: new Date(),
      messages: messages.filter(msg =>
        msg.role === 'user' || msg.role === 'assistant'
      )
    };

    // Load existing conversations
    const savedConversations = localStorage.getItem('ai_conversations');
    let conversations: Conversation[] = [];
    if (savedConversations) {
      try {
        conversations = JSON.parse(savedConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }

    // Update or add the conversation
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    if (existingIndex !== -1) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    // Save back to localStorage
    localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    setCurrentConversation(conversation);
  };
