import React, { useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import VirtualList from '@/components/shared/VirtualList.jsx';
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
function ConversationList({
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
          conversationId={conversation.id}
          onNavigate={handleClick}
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
            className="h-20 rounded-2xl bg-surface/60 backdrop-blur-md animate-pulse border border-white/[0.04]"
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
        {conversations.map((conversation, index) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            index={index}
            renderItem={renderItem}
          />
        ))}
      </div>
    );
  }

  return (
    <VirtualList
      items={conversations}
      renderItem={renderItem}
      estimateSize={80}
      overscan={5}
      gap={8}
      height="calc(100vh - 14rem)"
      className="overflow-auto"
      getItemKey={(index) => conversations[index]?.id || index}
    />
  );
}

/**
 * Stable wrapper so the animation-delay style object is isolated per row,
 * preventing the parent list re-render from recreating it needlessly.
 */
const ConversationRow = memo(function ConversationRow({ conversation, index, renderItem }) {
  return (
    <div
      className="will-change-transform transform-gpu animate-notification-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {renderItem(conversation)}
    </div>
  );
});

export default memo(ConversationList);
