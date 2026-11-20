Option Explicit
Dim fso, shell, scriptDir, projectRoot, nodeExe, supervisorScript, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(scriptDir)
supervisorScript = fso.BuildPath(scriptDir, "supervisor-24x7.mjs")
nodeExe = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(nodeExe) Then
  nodeExe = "node.exe"
End If

shell.CurrentDirectory = projectRoot
cmd = """" & nodeExe & """ """ & supervisorScript & """"
' WindowStyle 0 = hidden (no terminal flash), WaitOnReturn = True so Task Scheduler monitors lifetime
shell.Run cmd, 0, True
