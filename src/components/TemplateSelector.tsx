'use client';

import React, { useState, useEffect } from 'react';
import { Dismiss24Regular } from '@fluentui/react-icons';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  content: string;
}

interface CategoryGroup {
  category: string;
  name: string;
  icon: string;
  templates: Template[];
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string, templateName: string) => void;
}

export default function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
        if (data.categories.length > 0) {
          setSelectedCategory(data.categories[0].category);
        }
      }
    } catch (error) {
      console.error('템플릿 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.content, selectedTemplate.name);
      onClose();
      setSelectedTemplate(null);
      setPreviewMode(false);
    }
  };

  const handleBack = () => {
    setPreviewMode(false);
    setSelectedTemplate(null);
  };

  if (!isOpen) return null;

  const currentCategory = categories.find(c => c.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {previewMode ? (
              <span className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ←
                </button>
                {selectedTemplate?.icon} {selectedTemplate?.name}
              </span>
            ) : (
              '📋 템플릿 선택'
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Dismiss24Regular />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500">템플릿 로딩 중...</div>
          </div>
        ) : previewMode && selectedTemplate ? (
          /* 미리보기 모드 */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <p className="text-gray-600">{selectedTemplate.description}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-md border">
                {selectedTemplate.content}
              </pre>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                뒤로
              </button>
              <button
                onClick={handleUseTemplate}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                이 템플릿 사용
              </button>
            </div>
          </div>
        ) : (
          /* 템플릿 목록 모드 */
          <div className="flex-1 flex overflow-hidden">
            {/* 카테고리 사이드바 */}
            <div className="w-48 border-r bg-gray-50 p-2 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 flex items-center gap-2 ${
                    selectedCategory === cat.category
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {cat.templates.length}
                  </span>
                </button>
              ))}
            </div>

            {/* 템플릿 그리드 */}
            <div className="flex-1 p-4 overflow-y-auto">
              {currentCategory && (
                <div className="grid grid-cols-2 gap-4">
                  {currentCategory.templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{template.icon}</span>
                        <h3 className="font-medium">{template.name}</h3>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
