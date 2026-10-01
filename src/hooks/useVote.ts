import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VideoPost } from '../types';

export function useVote(video: VideoPost) {
  const [localVote, setLocalVote] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(video.likeCount || 0);
  const [dislikeCount, setDislikeCount] = useState(video.dislikeCount || 0);
  const prevProps = useRef({ likeCount: video.likeCount, dislikeCount: video.dislikeCount, id: video.id });

  useEffect(() => {
    // If the server data actually changed (or video changed), resync
    if (
      video.id !== prevProps.current.id ||
      video.likeCount !== prevProps.current.likeCount ||
      video.dislikeCount !== prevProps.current.dislikeCount
    ) {
      setLikeCount(video.likeCount || 0);
      setDislikeCount(video.dislikeCount || 0);
      prevProps.current = { likeCount: video.likeCount, dislikeCount: video.dislikeCount, id: video.id };
    }
    
    // Load local vote state
    const savedVote = localStorage.getItem(`vote_${video.id}`);
    if (savedVote === 'like' || savedVote === 'dislike') {
      setLocalVote(savedVote);
    }
  }, [video.id, video.likeCount, video.dislikeCount]);

  const handleVote = async (type: 'like' | 'dislike') => {
    if (!video.id) return;
    
    const videoRef = doc(db, 'posts', video.id);
    const updates: any = {};
    
    let newLikeCount = likeCount;
    let newDislikeCount = dislikeCount;

    if (localVote === type) {
      // Toggle off
      updates[`${type}Count`] = increment(-1);
      if (type === 'like') newLikeCount--;
      if (type === 'dislike') newDislikeCount--;
      setLocalVote(null);
      localStorage.removeItem(`vote_${video.id}`);
    } else {
      // Changing vote or new vote
      updates[`${type}Count`] = increment(1);
      if (type === 'like') newLikeCount++;
      if (type === 'dislike') newDislikeCount++;
      
      if (localVote) {
        updates[`${localVote}Count`] = increment(-1);
        if (localVote === 'like') newLikeCount--;
        if (localVote === 'dislike') newDislikeCount--;
      }
      
      setLocalVote(type);
      localStorage.setItem(`vote_${video.id}`, type);
    }

    // Optimistic update
    setLikeCount(newLikeCount);
    setDislikeCount(newDislikeCount);

    try {
      await setDoc(videoRef, updates, { merge: true });
    } catch (error) {
      console.error("Error updating vote:", error);
      // Revert optimism if failed (optional, but good practice)
      setLikeCount(video.likeCount || 0);
      setDislikeCount(video.dislikeCount || 0);
      setLocalVote(localStorage.getItem(`vote_${video.id}`) as any || null);
    }
  };

  const totalVotes = likeCount + dislikeCount;
  const likePercentage = totalVotes > 0 ? Math.round((likeCount / totalVotes) * 100) : null;

  return {
    likeCount,
    dislikeCount,
    likePercentage,
    localVote,
    handleVote
  };
}
