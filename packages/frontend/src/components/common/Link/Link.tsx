import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'

export const Link = forwardRef(function Link(
  props: { href: string } & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const { href, onClick, ...otherProps } = props
  const navigate = useNavigate()
  
  // Check if it's an external link
  const isExternal = href.startsWith('http') || href.startsWith('mailto:')
  
  if (isExternal) {
    return (
      <Headless.DataInteractive>
        <a href={href} onClick={onClick} {...otherProps} ref={ref} />
      </Headless.DataInteractive>
    )
  }
  
  // Handle internal navigation with useNavigate for better Electron compatibility
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    
    // Call the original onClick if provided
    if (onClick) {
      onClick(event)
    }
    
    // Navigate using React Router's navigate function
    navigate(href)
  }
  
  return (
    <Headless.DataInteractive>
      <a href={href} onClick={handleClick} {...otherProps} ref={ref} />
    </Headless.DataInteractive>
  )
})
