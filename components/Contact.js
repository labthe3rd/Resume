'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Mail, Linkedin, Globe, Send, MapPin, CheckCircle } from 'lucide-react'

export default function Contact() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const mailtoLink = `mailto:Labthe3rd@gmail.com?subject=Contact from ${formState.name}&body=${encodeURIComponent(formState.message)}%0A%0AFrom: ${formState.email}`
    window.location.href = mailtoLink
    setIsSubmitted(true)
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  const contactLinks = [
    {
      icon: Mail,
      label: 'Email',
      value: 'Labthe3rd@gmail.com',
      href: 'mailto:Labthe3rd@gmail.com',
      color: '#00d4ff'
    },
    {
      icon: Linkedin,
      label: 'LinkedIn',
      value: 'louis-bersine-iii',
      href: 'https://www.linkedin.com/in/louis-bersine-iii',
      color: '#0077b5'
    },
    {
      icon: Globe,
      label: 'Website',
      value: 'louisbersine.com',
      href: 'https://www.louisbersine.com/',
      color: '#a855f7'
    },
    {
      icon: MapPin,
      label: 'Location',
      value: 'Grand Rapids, MI',
      href: null,
      color: '#10b981'
    }
  ]

  return (
    <section
      id="contact"
      ref={ref}
      style={{
        padding: '8rem 2rem',
        position: 'relative',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0, 212, 255, 0.03) 100%)'
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <span className="section-subtitle">Get in Touch</span>
          <h2 className="section-title">
            Let's <span className="gradient-text">Connect</span>
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            maxWidth: 600,
            margin: '1rem auto 0'
          }}>
            Interested in discussing industrial automation, OT security, or potential collaborations? 
            I'd love to hear from you.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '3rem',
          maxWidth: 1000,
          margin: '0 auto'
        }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '2rem'
            }}>
              Contact Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contactLinks.map((link, index) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  {link.href ? (
                    <motion.a
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      whileHover={{ x: 10 }}
                      className="glass-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.25rem',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `${link.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <link.icon size={22} style={{ color: link.color }} />
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.25rem'
                        }}>
                          {link.label}
                        </div>
                        <div style={{ fontWeight: 500 }}>{link.value}</div>
                      </div>
                    </motion.a>
                  ) : (
                    <div
                      className="glass-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.25rem'
                      }}
                    >
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `${link.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <link.icon size={22} style={{ color: link.color }} />
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.25rem'
                        }}>
                          {link.label}
                        </div>
                        <div style={{ fontWeight: 500 }}>{link.value}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '2rem'
            }}>
              Send a Message
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem'
                }}>
                  Name
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    color: 'white',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    color: 'white',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem'
                }}>
                  Message
                </label>
                <textarea
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    color: 'white',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="cta-button"
                style={{
                  justifyContent: 'center',
                  marginTop: '0.5rem'
                }}
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle size={18} />
                    Opening Email Client...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
