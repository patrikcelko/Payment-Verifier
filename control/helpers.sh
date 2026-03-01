#!/usr/bin/env bash

C_BLACK=$(tput setaf 0)
C_RED=$(tput setaf 1)
C_GREEN=$(tput setaf 2)
C_YELLOW=$(tput setaf 3)
C_BLUE=$(tput setaf 4)
C_MAGENTA=$(tput setaf 5)
C_CYAN=$(tput setaf 6)
C_WHITE=$(tput setaf 7)
C_BRIGHT_BLACK=$(tput setaf 8)
C_BRIGHT_RED=$(tput setaf 9)
C_BRIGHT_GREEN=$(tput setaf 10)
C_BRIGHT_YELLOW=$(tput setaf 11)
C_BRIGHT_BLUE=$(tput setaf 12)
C_BRIGHT_MAGENTA=$(tput setaf 13)
C_BRIGHT_CYAN=$(tput setaf 14)
C_BRIGHT_WHITE=$(tput setaf 15)
C_NC=$(tput sgr0)

function option {
	echo -e "${C_GREEN}$1${C_WHITE}"
}

function success {
    echo -e "${C_GREEN}[OK] $1${C_NC}"
}

function error {
    echo -e "${C_RED}[Error] $1${C_NC}"
}

function info {
    echo -e "${C_CYAN}[Info] $1${C_NC}"
}

function warning {
    echo -e "${C_YELLOW}[Warning] $1${C_NC}"
}

function logo {
    echo -e "${C_GREEN}";
    echo -e "  ____                                  _    __     __           __            ";
    echo -e " |  _ \ __ _ _   _ _ __ ___   ___ _ __ | |_  \ \   / /__ _ __(_)/ _(_) ___ _ __ ";
    echo -e " | |_) / _\` | | | | '_ \` _ \ / _ \ '_ \| __|  \ \ / / _ \ '__| | |_| |/ _ \ '__|";
    echo -e " |  __/ (_| | |_| | | | | | |  __/ | | | |_    \ V /  __/ |  | |  _| |  __/ |   ";
    echo -e " |_|   \__,_|\__, |_| |_| |_|\___|_| |_|\__|    \_/ \___|_|  |_|_| |_|\___|_|   ";
    echo -e "             |___/                                                               ";
    printf "${C_NC}";
}

function header {
    echo -e "${C_YELLOW}▄${C_WHITE}"
    echo -e "${C_YELLOW}█ ${C_WHITE}${C_RED}$1${C_WHITE}"
    echo -e "${C_YELLOW}▀${C_WHITE}"
}

function print_help {
    logo
    header "Payment Verifier helper-script"

    option "  help"
    echo "    Display this help message."

    option "  deploy"
    echo "    Deploy Payment Verifier to a remote server. (Must be configured in the script)"

    option "  build"
    echo "    Build the Docker image and push it to the registry."

    option "  start-docker"
    echo "    Start already built container. This is the preferred method to use."
    echo "    Note that if the container is not built, this process will fail."

    option "  rebuild-docker"
    echo "    This command will add a forced build attribute to docker compose."
    echo "    It should not affect stored data, however be careful."

    option "  kill-docker"
    echo "    Forcefully kills all running docker containers (all containers!)."

    option "  enter [name|id]"
    echo "    Allows us to enter any of the running docker containers if an ID"
    echo "    or name is provided. If left empty, a listing will be displayed."
    echo
}