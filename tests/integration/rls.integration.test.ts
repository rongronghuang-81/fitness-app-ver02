/**
 * Live RLS and storage tests against a real Supabase project.
 *
 * These are SKIPPED unless TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY and
 * TEST_SUPABASE_SERVICE_ROLE_KEY are set — point them at a local
 * `supabase start` instance, never at production. The same guarantees are
 * covered without any credentials by `npm run test:sql`, which applies the
 * migrations to a throwaway PostgreSQL database.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.TEST_SUPABASE_URL
const anonKey = process.env.TEST_SUPABASE_ANON_KEY
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
const configured = Boolean(url && anonKey && serviceKey)

const describeLive = configured ? describe : describe.skip

describeLive('Row Level Security against a live project', () => {
  const admin = configured
    ? createClient(url!, serviceKey!, { auth: { persistSession: false } })
    : (null as unknown as SupabaseClient)

  const suffix = Math.random().toString(36).slice(2, 8)
  const alice = { email: `alice-${suffix}@example.test`, password: 'test-password-123' }
  const bob = { email: `bob-${suffix}@example.test`, password: 'test-password-123' }

  let aliceId = ''
  let bobId = ''
  let aliceClient: SupabaseClient
  let bobClient: SupabaseClient
  let anonClient: SupabaseClient
  let aliceStudentId = ''

  beforeAll(async () => {
    const a = await admin.auth.admin.createUser({ ...alice, email_confirm: true })
    const b = await admin.auth.admin.createUser({ ...bob, email_confirm: true })
    aliceId = a.data.user!.id
    bobId = b.data.user!.id

    aliceClient = createClient(url!, anonKey!, { auth: { persistSession: false } })
    bobClient = createClient(url!, anonKey!, { auth: { persistSession: false } })
    anonClient = createClient(url!, anonKey!, { auth: { persistSession: false } })

    await aliceClient.auth.signInWithPassword(alice)
    await bobClient.auth.signInWithPassword(bob)

    const { data } = await aliceClient
      .from('students')
      .insert({ first_name: 'Sarah' })
      .select('id')
      .single()
    aliceStudentId = data!.id
  })

  afterAll(async () => {
    if (!configured) return
    for (const id of [aliceId, bobId]) {
      if (id) await admin.auth.admin.deleteUser(id)
    }
  })

  it('signs a new instructor up with a profile and default taxonomy', async () => {
    const { data: profile } = await aliceClient.from('profiles').select('id').maybeSingle()
    expect(profile?.id).toBe(aliceId)

    const { count } = await aliceClient
      .from('levels')
      .select('id', { count: 'exact', head: true })
    expect(count).toBeGreaterThan(0)
  })

  it('lets an instructor read their own students', async () => {
    const { data } = await aliceClient.from('students').select('id, first_name')
    expect(data).toHaveLength(1)
    expect(data![0]!.first_name).toBe('Sarah')
  })

  it('hides one instructor’s students from another', async () => {
    const { data } = await bobClient.from('students').select('id')
    expect(data).toEqual([])
  })

  it('refuses a cross-owner update', async () => {
    const { data } = await bobClient
      .from('students')
      .update({ first_name: 'Hacked' })
      .eq('id', aliceStudentId)
      .select('id')
    expect(data).toEqual([])

    const { data: unchanged } = await aliceClient
      .from('students')
      .select('first_name')
      .eq('id', aliceStudentId)
      .single()
    expect(unchanged!.first_name).toBe('Sarah')
  })

  it('refuses a cross-owner delete', async () => {
    await bobClient.from('students').delete().eq('id', aliceStudentId)
    const { count } = await aliceClient
      .from('students')
      .select('id', { count: 'exact', head: true })
    expect(count).toBe(1)
  })

  it('stamps owner_id from the session, ignoring client-supplied values', async () => {
    const { data } = await bobClient
      .from('students')
      .insert({ first_name: 'Smuggled', owner_id: aliceId })
      .select('owner_id')
      .single()
    expect(data!.owner_id).toBe(bobId)
  })

  it('returns nothing to an unauthenticated caller', async () => {
    const { data } = await anonClient.from('students').select('id')
    expect(data ?? []).toEqual([])
  })

  it('keeps the media bucket private', async () => {
    const { data } = await anonClient.storage.from('student-media').list()
    expect(data ?? []).toEqual([])
  })

  it('scopes global_search to the caller', async () => {
    const { data: mine } = await aliceClient.rpc('global_search', { p_query: 'Sarah' })
    expect((mine ?? []).length).toBeGreaterThan(0)

    const { data: theirs } = await bobClient.rpc('global_search', { p_query: 'Sarah' })
    expect(theirs ?? []).toEqual([])
  })
})

if (!configured) {
  describe('Supabase integration tests', () => {
    it.skip('skipped: set TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY and TEST_SUPABASE_SERVICE_ROLE_KEY to run', () => {})
  })
}
