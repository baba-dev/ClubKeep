package com.bababuilds.clubkeep.health

import org.junit.Assert.assertEquals
import org.junit.Test

class SyncContractTest {
    @Test fun reportsAreExplicitAboutReplayedWorkAndSource() {
        val report = SyncReport(12, 2, "incremental")
        assertEquals(12, report.imported)
        assertEquals(2, report.deleted)
        assertEquals("incremental", report.mode)
    }
}
