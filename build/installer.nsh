!macro customRemoveFiles
    FindFirst $0 $1 "$INSTDIR\*"
    ;MessageBox MB_OK "$INSTDIR"
    loop:
      ;MessageBox MB_OK "$INSTDIR\$1"
      StrCmp $1 "" done
      
      ; Delete files one by one
      StrCmp $1 "." skip
      
      ; Don't delete folders / files in parent directory
      StrCmp $1 ".." skip

      ${if} ${isUpdated}
        StrCmp $1 "assets" skip
      ${EndIf}
      
      ${If} ${FileExists} "$INSTDIR\$1\*.*"
        ; Is a folder
        RMDir /r "$INSTDIR\$1"
      ${Else}
        ; Is a file
         Delete "$INSTDIR\$1"
      ${EndIf}
      
      skip:
      FindNext $0 $1
      Goto loop
    done:
    FindClose $0
!macroend

!macro customHeader
  ; Workaround for https://github.com/electron-userland/electron-builder/issues/4803
  !define /redef APP_FILENAME "BeyondAllReason"
!macroend
