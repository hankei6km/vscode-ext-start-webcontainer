import matchers from '@testing-library/jest-dom/matchers'
// https://github.com/vitest-dev/vitest/issues/1504
import { expect } from 'vitest'

expect.extend(matchers)
