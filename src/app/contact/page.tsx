'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Please select a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();
      formData.append('your-name', data.name);
      formData.append('your-email', data.email);
      formData.append('your-phone', data.phone || '');
      formData.append('your-subject', data.subject);
      formData.append('your-message', data.message);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/contact-form-7/v1/contact-forms/223f927/feedback`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (result.status === 'mail_sent') {
        setSubmitStatus('success');
        reset();
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Form submission failed:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Contact Us
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Whether you have a question, suggestion, or collaboration inquiry, we'd love to
              hear from you. The NovaFabric team will get back to you promptly.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h2 className="font-heading text-2xl font-bold text-gray-900">
                  Send Us a Message
                </h2>
                <p className="mt-2 text-gray-600">
                  Fields marked with * are required
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Input
                      label="Name *"
                      placeholder="Your name"
                      error={errors.name?.message}
                      {...register('name')}
                    />
                    <Input
                      label="Email *"
                      type="email"
                      placeholder="your@email.com"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      placeholder="+86 138 0000 0000"
                      {...register('phone')}
                    />
                    <div className="w-full">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Subject *
                      </label>
                      <select
                        className={cn(
                          'flex h-11 w-full border border-gray-300 bg-white px-4 py-2 text-sm transition-colors',
                          'focus:border-black focus:outline-none focus:ring-1 focus:ring-black',
                          errors.subject && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        )}
                        {...register('subject')}
                      >
                        <option value="">Select a subject</option>
                        <option value="product">Product Inquiry</option>
                        <option value="order">Order Related</option>
                        <option value="shipping">Shipping Issues</option>
                        <option value="return">Returns & Exchanges</option>
                        <option value="wholesale">Wholesale Partnerships</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.subject?.message && (
                        <p className="mt-1.5 text-sm text-red-500">{errors.subject.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Message *
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Please describe what you'd like to discuss..."
                      className={cn(
                        'flex w-full border border-gray-300 bg-white px-4 py-3 text-sm transition-colors',
                        'placeholder:text-gray-400',
                        'focus:border-black focus:outline-none focus:ring-1 focus:ring-black',
                        errors.message && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      )}
                      {...register('message')}
                    />
                    {errors.message?.message && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.message.message}</p>
                    )}
                  </div>

                  {submitStatus === 'success' && (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                      Thank you for your message! We will get back to you as soon as possible.
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                      Submission failed. Please try again later or contact us directly via email.
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    Send Message
                  </Button>
                </form>
              </div>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-1">
              <div className="space-y-8">
                {/* Contact Cards */}
                <div className="rounded-lg border border-gray-200 bg-white p-8">
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    Customer Support
                  </h3>
                  <p className="mt-2 text-gray-600">
                    support@novafabric.com
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Replies within 24 hours on business days
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-8">
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    Wholesale Inquiries
                  </h3>
                  <p className="mt-2 text-gray-600">
                    wholesale@novafabric.com
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Looking for business partnerships? We'd love to hear from you.
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-8">
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    Follow Us
                  </h3>
                  <div className="mt-4 flex gap-4">
                    <a href="#" className="text-gray-400 hover:text-gray-600">
                      <span className="sr-only">Instagram</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-gray-600">
                      <span className="sr-only">Twitter</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-gray-600">
                      <span className="sr-only">WeChat</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.108.24-.243 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.18 2.905c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* FAQ Link */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    Frequently Asked Questions
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Before reaching out, check our FAQ page — you might find the answer you're
                    looking for.
                  </p>
                  <Link
                    href="/faq"
                    className="mt-4 inline-block text-sm font-medium text-black underline underline-offset-4 hover:no-underline"
                  >
                    View FAQ &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
