import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VirtualList from '@/components/VirtualList.jsx';
import ConversationItem from './ConversationItem.jsx';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';

/**
 * Virtualized list of conversations.
 *
 * @param {Object} props
 * @param {Array<object>} props.conversations
 * @param {Map<string, object>} props.profiles
 * @param {string} props.currentUserId
 * @param {Map<string, number>} [props.unreadMap]
 * @param {boolean} [props.isLoading]
 */
export default function ConversationList({
  conversations,
  profiles,
  currentUserId,
  unreadMap = new Map(),
  isLoading,
}) {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (id) => {
      navigate(`/messages/${id}`);
    },
    [navigate]
  );

  const renderItem = useCallback(
    (conversation) => {
      const otherId = conversation.participant_ids?.find(
        (id) => id !== currentUserId
      );
      const profile = profiles.get(otherId) || null;
      const unreadCount = unreadMap.get(conversation.id) || 0;

      return (
        <ConversationItem
          conversation={conversation}
          profile={profile}
          unreadCount={unreadCount}
          onClick={() => handleClick(conversation.id)}
        />
      );
    },
    [currentUserId, profiles, unreadMap, handleClick]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-secondary/30 backdrop-blur-md animate-pulse border border-border/50"
          />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return null;
  }

  const shouldVirtualize = conversations.length >= VIRTUALIZATION_THRESHOLD;

  if (!shouldVirtualize) {
    return (
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <div key={conversation.id}>
            {renderItem(conversation)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <VirtualList
      items={conversations}
      renderItem={(item) => renderItem(item)}
      estimateSize={80}
      overscan={5}
      gap={8}
      height="calc(100vh - 14rem)"
      className="overflow-auto"
      getItemKey={(index) => conversations[index]?.id || index}
    />
  );
}
