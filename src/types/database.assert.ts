/**
 * Compile-time guards for the hand-written database types.
 *
 * Supabase resolves every Row to `never` if `Database['public']` fails its
 * `GenericSchema` constraint — silently, with no error at the definition site.
 * (Declaring the row shapes with `interface` instead of `type` is enough to
 * cause it, because interfaces have no implicit index signature.) These asserts
 * turn that into a build failure in `npm run typecheck`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile, Student } from './database'

type Expect<T extends true> = T
type IsNotNever<T> = [T] extends [never] ? false : true
type Extends<A, B> = A extends B ? true : false

type Schema = Database['public']
type Rows = Schema['Tables']

// Each table's Row must be a usable object type, not `never`.
type _Rows = Expect<IsNotNever<Rows['profiles']['Row']>>
type _Students = Expect<IsNotNever<Rows['students']['Row']>>
type _Classes = Expect<IsNotNever<Rows['classes']['Row']>>
type _Media = Expect<IsNotNever<Rows['media']['Row']>>

// The schema must satisfy what the client expects, or queries degrade to `never`.
type _SchemaShape = Expect<
  Extends<Schema, { Tables: Record<string, unknown>; Views: Record<string, unknown>; Functions: Record<string, unknown> }>
>
type _IndexSignature = Expect<Extends<Profile, Record<string, unknown>>>

// A typed client must resolve real column types off a select, which is the
// symptom that actually breaks pages when the schema constraint fails.
declare const client: SupabaseClient<Database>

async function _probeSelect() {
  const { data } = await client.from('students').select('first_name, active')
  return data
}

type Selected = NonNullable<Awaited<ReturnType<typeof _probeSelect>>>[number]
type _SelectIsNotNever = Expect<IsNotNever<Selected>>
type _SelectHasColumns = Expect<Extends<Selected, { first_name: string; active: boolean }>>

// An embedded join must resolve to the related row, not to a SelectQueryError.
// This is what the Relationships metadata on each table buys us.
async function _probeJoin() {
  const { data } = await client.from('terms').select('name, levels ( id, name )').maybeSingle()
  return data
}

type JoinedTerm = NonNullable<Awaited<ReturnType<typeof _probeJoin>>>
type _JoinIsNotNever = Expect<IsNotNever<JoinedTerm>>
type _JoinResolves = Expect<
  Extends<JoinedTerm, { name: string; levels: { id: string; name: string } | null }>
>

// Creating a student from a first name alone must typecheck (§7).
const minimalStudent: Rows['students']['Insert'] = { first_name: 'Sarah' }
void minimalStudent

// A row must keep its optional columns nullable rather than required.
const partialStudent: Partial<Student> = { goals: null }
void partialStudent

export type DatabaseTypesAreSound = true
