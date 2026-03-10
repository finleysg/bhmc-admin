"use client"

import {
	ChatBubbleBottomCenterTextIcon,
	CodeBracketIcon,
	EyeIcon,
	LinkIcon,
	ListBulletIcon,
	MinusIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline"
import type { Editor } from "@tiptap/react"

interface EditorToolbarProps {
	editor: Editor | null
	isMarkdownMode: boolean
	onToggleMode: () => void
	onLinkClick: () => void
}

function ToolbarButton({
	onClick,
	active,
	tooltip,
	children,
	disabled,
}: {
	onClick: () => void
	active?: boolean
	tooltip: string
	children: React.ReactNode
	disabled?: boolean
}) {
	return (
		<div className="tooltip tooltip-bottom" data-tip={tooltip}>
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={`btn btn-ghost btn-xs join-item ${active ? "btn-active" : ""}`}
			>
				{children}
			</button>
		</div>
	)
}

export function EditorToolbar({
	editor,
	isMarkdownMode,
	onToggleMode,
	onLinkClick,
}: EditorToolbarProps) {
	return (
		<div className="flex flex-wrap items-center gap-1 border-b border-base-300 bg-base-200 px-2 py-1">
			{!isMarkdownMode && editor && (
				<>
					<div className="join">
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleBold().run()}
							active={editor.isActive("bold")}
							tooltip="Bold"
						>
							<span className="text-sm font-bold">B</span>
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleItalic().run()}
							active={editor.isActive("italic")}
							tooltip="Italic"
						>
							<span className="text-sm italic">I</span>
						</ToolbarButton>
					</div>

					<div className="join">
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
							active={editor.isActive("heading", { level: 2 })}
							tooltip="Heading 2"
						>
							<span className="text-xs font-bold">H2</span>
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
							active={editor.isActive("heading", { level: 3 })}
							tooltip="Heading 3"
						>
							<span className="text-xs font-bold">H3</span>
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
							active={editor.isActive("heading", { level: 4 })}
							tooltip="Heading 4"
						>
							<span className="text-xs font-bold">H4</span>
						</ToolbarButton>
					</div>

					<div className="join">
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleBulletList().run()}
							active={editor.isActive("bulletList")}
							tooltip="Bullet list"
						>
							<ListBulletIcon className="h-4 w-4" />
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleOrderedList().run()}
							active={editor.isActive("orderedList")}
							tooltip="Ordered list"
						>
							<span className="text-xs font-bold">1.</span>
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleBlockquote().run()}
							active={editor.isActive("blockquote")}
							tooltip="Block quote"
						>
							<ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().setHorizontalRule().run()}
							tooltip="Horizontal rule"
						>
							<MinusIcon className="h-4 w-4" />
						</ToolbarButton>
					</div>

					<div className="join">
						<ToolbarButton onClick={onLinkClick} active={editor.isActive("link")} tooltip="Link">
							<LinkIcon className="h-4 w-4" />
						</ToolbarButton>
						<ToolbarButton
							onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
							tooltip="Clear formatting"
						>
							<XMarkIcon className="h-4 w-4" />
						</ToolbarButton>
					</div>
				</>
			)}

			<div className="ml-auto join">
				<button
					type="button"
					onClick={onToggleMode}
					disabled={!isMarkdownMode}
					className={`btn btn-xs join-item ${!isMarkdownMode ? "btn-primary" : "btn-ghost"}`}
				>
					<EyeIcon className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={onToggleMode}
					disabled={isMarkdownMode}
					className={`btn btn-xs join-item ${isMarkdownMode ? "btn-primary" : "btn-ghost"}`}
				>
					<CodeBracketIcon className="h-4 w-4" />
				</button>
			</div>
		</div>
	)
}
