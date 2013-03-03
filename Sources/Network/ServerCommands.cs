using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Network
{
    public enum UDPCommands
    {
        AddPlayer = -1,
        AddPlayerComplete = -2,
        ClientDisconnected = -3,
        ServerChanged = -4,
        ConnectToGame = -5
    }
}