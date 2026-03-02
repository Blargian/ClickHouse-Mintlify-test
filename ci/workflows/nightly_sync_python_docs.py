from praktika import Job, Workflow

from ci.defs.defs import BASE_BRANCH, SECRETS, RunnerLabels

workflow = Workflow.Config(
    name="NightlySyncPythonDocs",
    event=Workflow.Event.SCHEDULE,
    branches=[BASE_BRANCH],
    jobs=[
        Job.Config(
            name="Sync Python client docs",
            command="python3 ./ci/jobs/sync_python_docs.py",
            runs_on=RunnerLabels.STYLE_CHECK_ARM,
            enable_gh_auth=True,
        )
    ],
    secrets=SECRETS,
    enable_report=True,
    enable_cidb=False,
    cron_schedules=["0 3 * * *"],
)

WORKFLOWS = [
    workflow,
]
