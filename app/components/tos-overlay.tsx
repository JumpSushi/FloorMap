import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface TOSOverlayProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TOSOverlay({ isOpen, onAccept, onDecline }: TOSOverlayProps) {
  const [tosContent, setTosContent] = useState<string>("");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Load TOS content
    fetch("/tos.txt")
      .then((response) => response.text())
      .then((text) => setTosContent(text))
      .catch((error) => console.error("Error loading TOS:", error));
  }, []);

  // Throttle scroll updates using requestAnimationFrame
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    requestAnimationFrame(() => {
      const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      
      setScrollProgress(Math.min(scrollPercent, 100));
      setHasScrolledToBottom(isScrolledToBottom);
    });
  }, []);

  const formatTosContent = useMemo(() => {
    if (!tosContent) return [];
    
    return tosContent.split('\n').map((line, index) => {
      // Handle headers (numbered sections)
      if (line.match(/^\d+\.\s+[A-Z\s]+$/)) {
        return (
          <h2 key={index} className="text-lg font-bold mt-6 mb-2 text-foreground">
            {line}
          </h2>
        );
      }
      
      // Handle subsections (e.g., 3.1, 9.2)
      if (line.match(/^\d+\.\d+\s+/)) {
        return (
          <h3 key={index} className="text-md font-semibold mt-4 mb-2 text-foreground">
            {line}
          </h3>
        );
      }
      
      // Handle main title
      if (line === "TERMS OF SERVICE") {
        return (
          <h1 key={index} className="text-2xl font-bold text-center mb-2 text-foreground">
            {line}
          </h1>
        );
      }
      
      // Handle subtitle
      if (line === "FloorMap Indoor Mapping Services") {
        return (
          <p key={index} className="text-lg text-center mb-4 text-muted-foreground">
            {line}
          </p>
        );
      }
      
      // Handle dates
      if (line.startsWith("Effective Date:") || line.startsWith("Last Updated:")) {
        return (
          <p key={index} className="text-sm text-center mb-2 text-muted-foreground">
            {line}
          </p>
        );
      }
      
      // Handle bullet points
      if (line.trim().startsWith("•") || line.trim().match(/^[A-Z][a-z\s]+and/)) {
        return (
          <li key={index} className="ml-4 mb-1 text-sm text-foreground">
            {line.trim()}
          </li>
        );
      }
      
      // Handle company information section
      if (line.startsWith("Company Name:") || line.startsWith("Address:") || line.startsWith("Legal Contact:")) {
        return (
          <p key={index} className="text-sm mb-1 text-foreground font-medium">
            {line}
          </p>
        );
      }
      
      // Handle final acceptance line
      if (line.startsWith("BY USING THE SERVICE")) {
        return (
          <p key={index} className="text-sm font-bold mt-6 mb-4 p-4 bg-muted rounded text-foreground border-l-4 border-primary">
            {line}
          </p>
        );
      }
      
      // Regular paragraphs
      if (line.trim() && !line.match(/^[\s]*$/)) {
        return (
          <p key={index} className="mb-3 text-sm leading-relaxed text-foreground">
            {line}
          </p>
        );
      }
      
      // Empty lines
      return <div key={index} className="mb-2" />;
    });
  }, [tosContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-background/95 backdrop-blur border shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
        <CardHeader className="text-center border-b py-4">
          <CardTitle className="text-2xl text-foreground">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">
            Please read and accept our Terms of Service to continue using FloorMap
          </p>
        </CardHeader>
        
        <CardContent className="p-0">
          <div 
            className="h-[60vh] p-6 overflow-y-auto border-y bg-white dark:bg-gray-900 relative scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
            onScroll={handleScroll}
          >
            <div className="prose prose-sm max-w-none">
              {formatTosContent}
            </div>
            {/* Fade indicator at bottom when not scrolled to end */}
            {!hasScrolledToBottom && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
            )}
          </div>
          
          <div 
            className={`overflow-hidden transition-all duration-500 ease-out ${
              !hasScrolledToBottom ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                Please scroll down to read the complete Terms of Service before accepting
              </p>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-6 border-t bg-muted/50">
            <Button 
              variant="outline" 
              onClick={onDecline}
              className="min-w-[120px]"
            >
              Decline
            </Button>
            <div className="text-xs text-muted-foreground text-center flex-1 mx-4">
              By clicking "Accept", you agree to be bound by these Terms of Service
            </div>
            <Button 
              onClick={onAccept}
              disabled={!hasScrolledToBottom}
              className="min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
