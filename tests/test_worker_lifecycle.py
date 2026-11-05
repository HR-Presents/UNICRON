"""Regression coverage for durable worker cleanup and failure accounting."""
import unittest
from unittest.mock import patch

from backend.app import job_queue


class WorkerLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.job = {'id': 'job-1', 'case_id': 'case-1'}

    @patch.object(job_queue.threading, 'Thread')
    @patch.object(job_queue, 'finish')
    @patch.object(job_queue.investigation, 'run_workflow')
    @patch.object(job_queue, 'claim')
    def test_success_finishes_and_stops_heartbeat(self, claim, workflow, finish, thread):
        claim.return_value = self.job
        workflow.return_value = {'id': 'run-1'}
        self.assertTrue(job_queue.run_one('worker-1'))
        finish.assert_called_once_with('job-1', 'worker-1', 'completed', result_id='run-1')
        thread.return_value.join.assert_called_once_with(timeout=10)

    @patch.object(job_queue.threading, 'Thread')
    @patch.object(job_queue, 'finish')
    @patch.object(job_queue.investigation, 'run_workflow')
    @patch.object(job_queue, 'claim')
    def test_failure_finishes_and_stops_heartbeat(self, claim, workflow, finish, thread):
        claim.return_value = self.job
        workflow.side_effect = ValueError('failed')
        self.assertTrue(job_queue.run_one('worker-1'))
        finish.assert_called_once_with('job-1', 'worker-1', 'failed', error_type='ValueError')
        thread.return_value.join.assert_called_once_with(timeout=10)

    @patch.object(job_queue.threading, 'Thread')
    @patch.object(job_queue, 'finish')
    @patch.object(job_queue.investigation, 'run_workflow')
    @patch.object(job_queue, 'claim')
    def test_finish_error_still_stops_heartbeat(self, claim, workflow, finish, thread):
        claim.return_value = self.job
        workflow.return_value = {'id': 'run-1'}
        finish.side_effect = RuntimeError('database unavailable')
        with self.assertRaises(RuntimeError):
            job_queue.run_one('worker-1')
        thread.return_value.join.assert_called_once_with(timeout=10)

    @patch.object(job_queue.threading, 'Thread')
    @patch.object(job_queue, 'claim', return_value=None)
    def test_empty_queue_does_not_start_thread(self, claim, thread):
        self.assertFalse(job_queue.run_one('worker-1'))
        thread.assert_not_called()


if __name__ == '__main__':
    unittest.main()
