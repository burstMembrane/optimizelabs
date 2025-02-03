import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Define the fetch function
const fetchConversations = async () => {
  const response = await axios.get('/api/conversations');
  return response.data;
};

// Create the context
const ConversationContext = createContext({
  conversationList: [],
  isLoading: false,
  isError: false,
  error: null,
});

export const ConversationProvider: React.FC = ({ children }) => {
  // Use the useQuery hook
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 60000, // Data is considered fresh for 60 seconds
  });

  // Provide the data and loading/error states to the context
  return (
    <ConversationContext.Provider value={{ conversationList: data || [], isLoading, isError, error }}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => useContext(ConversationContext); 
